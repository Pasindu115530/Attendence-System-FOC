



-- =========================

-- 1. DEPARTMENTS

-- =========================

CREATE TABLE departments (

    id        SERIAL PRIMARY KEY,

    name      VARCHAR(100) NOT NULL UNIQUE

);



INSERT INTO departments (name) VALUES

('Computer Science'),

('Software Engineering'),

('Information Systems')

ON CONFLICT DO NOTHING;



-- =========================

-- 2. USERS (Student / Lecturer / Admin)

-- =========================

CREATE TABLE users (

    index_number        VARCHAR(50) PRIMARY KEY,

    registration_number VARCHAR(50) UNIQUE NOT NULL,

    full_name           VARCHAR(255) NOT NULL,

    nic                 VARCHAR(20) UNIQUE NOT NULL,



    role                VARCHAR(20) NOT NULL DEFAULT 'Student'

        CHECK (role IN ('Student', 'Lecturer', 'Admin')),



    department_id       INTEGER REFERENCES departments(id),

    batch_year          INTEGER,

    created_at          TIMESTAMPTZ DEFAULT NOW()

);



-- =========================

-- 3. SUBJECTS

-- =========================
CREATE TABLE subjects (
    id              SERIAL PRIMARY KEY,
    subject_code    VARCHAR(20) NOT NULL UNIQUE,
    subject_name    VARCHAR(255) NOT NULL,
    department_id   INTEGER REFERENCES departments(id)
);

-- =========================
-- 3.1 BATCH SUBJECTS
-- =========================
CREATE TABLE batch_subjects (
    id SERIAL PRIMARY KEY,
    batch_year INTEGER NOT NULL,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(batch_year, subject_id)
);


-- =========================

-- 4. CLASSROOMS

-- =========================

CREATE TABLE classrooms (

    id          SERIAL PRIMARY KEY,

    room_name   VARCHAR(100) UNIQUE NOT NULL,



    seat_count  INTEGER NOT NULL DEFAULT 0,



    lat_a DOUBLE PRECISION,

    lon_a DOUBLE PRECISION,



    lat_b DOUBLE PRECISION,

    lon_b DOUBLE PRECISION,



    lat_c DOUBLE PRECISION,

    lon_c DOUBLE PRECISION,



    lat_d DOUBLE PRECISION,

    lon_d DOUBLE PRECISION

); 



-- =========================

-- 5. TIMETABLE

-- =========================

CREATE TABLE timetable (

    id              SERIAL PRIMARY KEY,

    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,

    classroom_id    INTEGER NOT NULL REFERENCES classrooms(id),



    day_of_week     VARCHAR(10) NOT NULL,

    start_time      TIME NOT NULL,

    end_time        TIME NOT NULL

);



-- =========================

-- 6. ATTENDANCE

-- =========================

CREATE TABLE attendance (

    id              SERIAL PRIMARY KEY,



    index_number    VARCHAR(50) NOT NULL REFERENCES users(index_number),

    subject_id      INTEGER NOT NULL REFERENCES subjects(id),

    timetable_id    INTEGER NOT NULL REFERENCES timetable(id),



    lat_at_mark     DOUBLE PRECISION,

    lon_at_mark     DOUBLE PRECISION,



    status          VARCHAR(20) NOT NULL DEFAULT 'Absent'

        CHECK (status IN ('Present', 'Absent', 'Late', 'Medical')),



    medical_report  TEXT,

    marked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()

);