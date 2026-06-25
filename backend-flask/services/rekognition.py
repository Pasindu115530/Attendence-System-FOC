"""
services/rekognition.py — AWS Rekognition face management service.

Replaces the entire DeepFace / TensorFlow / OpenCV stack.
boto3 calls the AWS Rekognition API over HTTPS — no local ML model needed.

Operations:
  - index_face()   → registers a student's face into the Rekognition Collection
  - search_face()  → finds the best matching student for a live photo
  - delete_faces() → removes all face vectors for a given student_id
  - detect_faces() → validates that a usable face exists in an image

Credential priority (boto3 automatic):
  1. Environment variables (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)  ← local dev
  2. EC2 Instance IAM Role metadata endpoint                             ← production
"""

import io
import logging
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from flask import current_app

logger = logging.getLogger(__name__)


class RekognitionService:
    """Thin wrapper around boto3 Rekognition client."""

    def __init__(self, app=None):
        self._client = None
        self._s3 = None
        if app is not None:
            self.init_app(app)

    # ── Initialisation ────────────────────────────────────────────────────────

    def init_app(self, app):
        """Called by the Flask app factory to wire in config."""
        app.extensions["rekognition"] = self

    def _get_client(self):
        """Lazily build the boto3 client so we can read Flask app config."""
        if self._client is None:
            cfg = current_app.config
            kwargs = {"region_name": cfg["AWS_REGION"]}

            # Only pass explicit credentials if set — on EC2 IAM Role, leave blank.
            if cfg.get("AWS_ACCESS_KEY_ID") and cfg.get("AWS_SECRET_ACCESS_KEY"):
                kwargs["aws_access_key_id"]     = cfg["AWS_ACCESS_KEY_ID"]
                kwargs["aws_secret_access_key"] = cfg["AWS_SECRET_ACCESS_KEY"]

            self._client = boto3.client("rekognition", **kwargs)
            logger.info("Rekognition client initialised (region=%s)", cfg["AWS_REGION"])
        return self._client

    @property
    def _collection(self) -> str:
        return current_app.config["REKOGNITION_COLLECTION"]

    @property
    def _threshold(self) -> float:
        return current_app.config["FACE_MATCH_THRESHOLD"]

    # ── Core Operations ───────────────────────────────────────────────────────

    def detect_faces(self, image_bytes: bytes) -> dict:
        """
        Validate that at least one clear, front-facing face exists.
        Returns {"ok": True, "count": N} or {"ok": False, "reason": "..."}
        Used BEFORE index_face() to prevent bad photos from being registered.
        """
        try:
            response = self._get_client().detect_faces(
                Image={"Bytes": image_bytes},
                Attributes=["DEFAULT"],
            )
            faces = response.get("FaceDetails", [])
            if not faces:
                return {"ok": False, "reason": "No face detected in the image"}
            if len(faces) > 1:
                return {"ok": False, "reason": f"Multiple faces detected ({len(faces)}). Use a solo photo"}
            face = faces[0]
            if face.get("Confidence", 0) < 80:
                return {"ok": False, "reason": "Face detection confidence too low. Use a clearer photo"}
            return {"ok": True, "count": len(faces)}
        except (BotoCoreError, ClientError) as exc:
            logger.exception("detect_faces AWS error")
            return {"ok": False, "reason": f"AWS error: {exc}"}

    def index_face(self, user_id: str, image_bytes: bytes) -> dict:
        """
        Register (index) a student's face into the Rekognition Collection.

        - ExternalImageId is set to the user_id so SearchFacesByImage returns it.
        - Validates the image first with detect_faces().
        - Replaces any previous face vectors for the same user_id.

        Returns {"ok": True, "face_id": "...", "user_id": "..."} or {"ok": False, "reason": "..."}
        """
        # 1. Validate the image before indexing
        detection = self.detect_faces(image_bytes)
        if not detection["ok"]:
            return {"ok": False, "reason": detection["reason"]}

        # 2. Remove any existing faces for this user_id first (update scenario)
        self._remove_existing_faces(user_id)

        # 3. Index the new face
        try:
            response = self._get_client().index_faces(
                CollectionId=self._collection,
                Image={"Bytes": image_bytes},
                ExternalImageId=user_id,          # ← stored alongside the face vector
                DetectionAttributes=["DEFAULT"],
                MaxFaces=1,                       # only index the dominant face
                QualityFilter="MEDIUM",           # reject blurry / occluded faces
            )
            face_records = response.get("FaceRecords", [])
            if not face_records:
                return {"ok": False, "reason": "Rekognition could not index a face in the image"}

            face_id = face_records[0]["Face"]["FaceId"]
            logger.info("Indexed face for user_id=%s  face_id=%s", user_id, face_id)
            return {"ok": True, "face_id": face_id, "user_id": user_id}

        except (BotoCoreError, ClientError) as exc:
            logger.exception("index_faces AWS error for user_id=%s", user_id)
            return {"ok": False, "reason": f"AWS error: {exc}"}

    def search_face(self, image_bytes: bytes) -> dict:
        """
        Search the Collection for the best matching face.

        Returns:
          {"ok": True,  "user_id": "S001", "confidence": 99.2, "face_id": "..."}
          {"ok": False, "reason": "No matching face found"}
        """
        try:
            response = self._get_client().search_faces_by_image(
                CollectionId=self._collection,
                Image={"Bytes": image_bytes},
                MaxFaces=1,
                FaceMatchThreshold=self._threshold,  # minimum similarity %
            )
            matches = response.get("FaceMatches", [])
            if not matches:
                return {"ok": False, "reason": "No matching face found in collection"}

            best = matches[0]
            face       = best["Face"]
            confidence = round(best["Similarity"], 2)
            user_id    = face.get("ExternalImageId", "")

            logger.info("Face matched: user_id=%s  confidence=%.1f%%", user_id, confidence)
            return {
                "ok":         True,
                "user_id":    user_id,
                "confidence": confidence,
                "face_id":    face["FaceId"],
            }

        except self._get_client().exceptions.InvalidParameterException:
            # Rekognition raises this when no face is detected in the search image
            return {"ok": False, "reason": "No face detected in the uploaded image"}
        except (BotoCoreError, ClientError) as exc:
            logger.exception("search_faces_by_image AWS error")
            return {"ok": False, "reason": f"AWS error: {exc}"}

    def delete_faces(self, user_id: str) -> dict:
        """
        Remove ALL face vectors associated with a user_id from the Collection.
        Useful for re-registration or account deletion.
        """
        removed = self._remove_existing_faces(user_id)
        return {"ok": True, "removed_count": removed}

    # ── Internal Helpers ──────────────────────────────────────────────────────

    def _remove_existing_faces(self, user_id: str) -> int:
        """
        List all faces in the Collection with ExternalImageId == user_id and delete them.
        Returns the count of deleted faces.
        """
        client = self._get_client()
        try:
            paginator = client.get_paginator("list_faces")
            face_ids_to_delete = []

            for page in paginator.paginate(CollectionId=self._collection):
                for face in page.get("Faces", []):
                    if face.get("ExternalImageId") == user_id:
                        face_ids_to_delete.append(face["FaceId"])

            if face_ids_to_delete:
                client.delete_faces(
                    CollectionId=self._collection,
                    FaceIds=face_ids_to_delete,
                )
                logger.info(
                    "Removed %d existing face(s) for user_id=%s",
                    len(face_ids_to_delete), user_id,
                )
            return len(face_ids_to_delete)

        except (BotoCoreError, ClientError) as exc:
            logger.warning("Could not remove existing faces for %s: %s", user_id, exc)
            return 0


# ── Module-level singleton (used via current_app.extensions) ──────────────────
rekognition_service = RekognitionService()
