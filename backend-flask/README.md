# Attendance API

A Flask REST API for the Smart Attendance System with GPS geofencing and DeepFace-powered face verification.

---

## Project Structure

```
attendance-api/
├── app.py                  # App factory & entry point
├── config.py               # Config from environment variables
├── requirements.txt
├── .env.example
│
├── database/
│   ├── db.py               # PostgreSQL connection (psycopg2)
│   └── models.py           # SQL schema reference
│
├── routes/
│   ├── auth.py             # POST /login
│   ├── dashboard.py        # POST /get_dashboard, /get_admin_dashboard
│   ├── attendance.py       # POST /mark_attendance
│   ├── admin.py            # POST /get_departments, /get_batches, /get_courses,
│   │                       #       /get_all_students, /get_all_classrooms,
│   │                       #       /get_all_courses, /add_timetable, /update_geofence
│   ├── report.py           # POST /get_filtered_report, /get_absent_records
│   ├── upload.py           # POST /upload_medical
│   └── classroom.py        # POST /verify-face  (DeepFace)
│
├── services/
│   ├── geofence.py         # Ray-casting & Haversine helpers
│   └── attendance_service.py  # Mark-attendance orchestration
│
├── utils/
│   ├── helpers.py          # Colombo-timezone date/time helpers
│   └── response.py         # success() / error() / failed() JSON helpers
│
└── uploads/
    └── medical/            # Uploaded medical certificates
```

---

## Setup

### 1. Clone & install

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Supabase/PostgreSQL credentials
```

`.env` keys:

| Key | Description |
|---|---|
| `DB_HOST` | Supabase DB host |
| `DB_PORT` | Default `6543` (PgBouncer) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASS` | Database password |
| `UPLOAD_FOLDER` | Path for medical uploads (default `uploads/medical`) |
| `KNOWN_STUDENTS_PATH` | Folder of reference face photos (default `known_students`) |
| `FACE_MODEL` | DeepFace model (`VGG-Face`, `Facenet`, etc.) |

### 3. Initialise the database

Run the SQL in `database/models.py` against your Supabase instance.

### 4. Prepare face reference photos

Place one photo per student in `known_students/`, named `<student_id>.<ext>`:

```
known_students/
├── S1001.jpg
├── S1002.png
└── ...
```

### 5. Run the server

```bash
python app.py
```

Server starts at `http://0.0.0.0:5000`.

---

## API Reference

All endpoints accept and return JSON (`Content-Type: application/json`) unless noted.

### Auth

| Method | Endpoint | Body |
|---|---|---|
| POST | `/login` | `{ "username": "...", "password": "..." }` |

### Student Dashboard

| Method | Endpoint | Body |
|---|---|---|
| POST | `/get_dashboard` | `{ "user_id": "..." }` |

### Attendance

| Method | Endpoint | Body |
|---|---|---|
| POST | `/mark_attendance` | `{ "user_id", "timetable_id", "course_id", "latitude", "longitude" }` |

### Face Verification

| Method | Endpoint | Body |
|---|---|---|
| POST | `/verify-face` | `multipart/form-data` — field `image` |

**Response (match):**
```json
{ "status": "success", "message": "Face matched successfully", "student_id": "S1001" }
```

**Response (no match):**
```json
{ "status": "failed", "message": "Face does not match any student" }
```

### Admin

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/get_departments` | — |
| POST | `/get_batches` | — |
| POST | `/get_courses` | Optional body: `{ "dept_id": "..." }` |
| POST | `/get_all_students` | — |
| POST | `/get_all_classrooms` | — |
| POST | `/get_all_courses` | — |
| POST | `/add_timetable` | `{ "course_id", "classroom_id", "day_of_week", "start_time", "end_time", "dept_id" }` |
| POST | `/update_geofence` | `{ "room_name", "lat_a", "lon_a", ... "lat_d", "lon_d" }` |
| POST | `/get_admin_dashboard` | — |

### Reports

| Method | Endpoint | Body |
|---|---|---|
| POST | `/get_filtered_report` | `{ "dept_id", "batch", "course_id" }` |
| POST | `/get_absent_records` | `{ "student_id": "..." }` |

### Upload

| Method | Endpoint | Body |
|---|---|---|
| POST | `/upload_medical` | `multipart/form-data` — fields `record_id` + `medical_file` |

---

## Geofencing Logic

Each classroom is defined by four GPS corner coordinates (A–D). When a student marks attendance the system:

1. **Ray-casting** — checks if the GPS point falls strictly inside the quadrilateral.
2. **Centroid fallback** — checks if the point is within **10 m** of the bounding-box centre (handles GPS drift near edges).

If either check passes → `status = 'Present'`, otherwise `'Absent'`.
