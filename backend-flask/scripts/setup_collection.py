"""
scripts/setup_collection.py
────────────────────────────
One-time setup script: creates the AWS Rekognition Face Collection.

Run this ONCE before starting the Flask app:
    cd backend-flask
    python scripts/setup_collection.py

A Rekognition Collection is a server-side face index (like a database)
that stores face vectors. It is NOT an S3 bucket — face images are not
permanently stored inside it, only their mathematical face embeddings.

Requirements:
    - AWS credentials configured in .env (or EC2 IAM Role)
    - pip install boto3 python-dotenv
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load .env from the backend-flask/ root (parent of scripts/)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

AWS_REGION             = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID      = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY  = os.getenv("AWS_SECRET_ACCESS_KEY")
COLLECTION_ID          = os.getenv("REKOGNITION_COLLECTION", "attendance-students")


def get_client():
    kwargs = {"region_name": AWS_REGION}
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"]     = AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = AWS_SECRET_ACCESS_KEY
    return boto3.client("rekognition", **kwargs)


def create_collection(client, collection_id: str):
    print(f"\n🔧  Creating Rekognition Collection: '{collection_id}'")
    try:
        response = client.create_collection(CollectionId=collection_id)
        status = response.get("StatusCode")
        arn    = response.get("CollectionArn", "")
        print(f"✅  Collection created  (HTTP {status})")
        print(f"    ARN : {arn}")
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code == "ResourceAlreadyExistsException":
            print(f"ℹ️   Collection '{collection_id}' already exists — nothing to do.")
        else:
            print(f"❌  AWS error: {exc}")
            sys.exit(1)


def list_collections(client):
    print("\n📋  Existing collections in your account:")
    try:
        response = client.list_collections()
        collections = response.get("CollectionIds", [])
        if collections:
            for c in collections:
                print(f"    • {c}")
        else:
            print("    (none)")
    except ClientError as exc:
        print(f"❌  Could not list collections: {exc}")


def main():
    print("=" * 60)
    print("  AWS Rekognition — Attendance System Setup")
    print("=" * 60)
    print(f"  Region     : {AWS_REGION}")
    print(f"  Collection : {COLLECTION_ID}")
    print(f"  Credentials: {'env vars' if AWS_ACCESS_KEY_ID else 'IAM Role / default chain'}")

    client = get_client()
    list_collections(client)
    create_collection(client, COLLECTION_ID)
    list_collections(client)

    print("\n✅  Setup complete! You can now start the Flask app.")
    print("    Registered faces will be stored in this collection.")
    print("=" * 60)


if __name__ == "__main__":
    main()
