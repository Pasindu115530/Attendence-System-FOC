"""
Database schema reference for the attendance system.
Run these SQL statements in your Supabase/PostgreSQL instance to initialise the schema.
"""

CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    user_id     VARCHAR(50) PRIMARY KEY,
    full_name   VARCHAR(255) NOT NULL,
    nic         VARCHAR(50)  NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'Student',
    dept_id     VARCHAR(50),
    batch_year  INTEGER
);
"""

CREATE_COURSES = """
CREATE TABLE IF NOT EXISTS courses (
    id          SERIAL PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL
);
"""

CREATE_CLASSROOMS = """
CREATE TABLE IF NOT EXISTS classrooms (
    id          SERIAL PRIMARY KEY,
    room_name   VARCHAR(100) NOT NULL UNIQUE,
    lat_a       DOUBLE PRECISION,
    lon_a       DOUBLE PRECISION,
    lat_b       DOUBLE PRECISION,
    lon_b       DOUBLE PRECISION,
    lat_c       DOUBLE PRECISION,
    lon_c       DOUBLE PRECISION,
    lat_d       DOUBLE PRECISION,
    lon_d       DOUBLE PRECISION
);
"""

CREATE_TIMETABLE = """
CREATE TABLE IF NOT EXISTS timetable (
    id           SERIAL PRIMARY KEY,
    course_id    INTEGER NOT NULL REFERENCES courses(id),
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id),
    dept_id      VARCHAR(50),
    day_of_week  VARCHAR(10) NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL
);
"""

CREATE_ATTENDANCE = """
CREATE TABLE IF NOT EXISTS attendance (
    id             SERIAL PRIMARY KEY,
    user_id        VARCHAR(50) NOT NULL REFERENCES users(user_id),
    course_id      INTEGER     NOT NULL REFERENCES courses(id),
    timetable_id   INTEGER     NOT NULL REFERENCES timetable(id),
    lat_at_mark    DOUBLE PRECISION,
    lon_at_mark    DOUBLE PRECISION,
    status         VARCHAR(20) NOT NULL DEFAULT 'Absent',
    medical_report VARCHAR(500),
    marked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

ALL_STATEMENTS = [
    CREATE_USERS,
    CREATE_COURSES,
    CREATE_CLASSROOMS,
    CREATE_TIMETABLE,
    CREATE_ATTENDANCE,
]
