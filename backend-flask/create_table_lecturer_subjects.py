import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config import Config
import psycopg2
from database.db import get_connection

def setup_db():
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS lecturer_subjects (
        id SERIAL PRIMARY KEY,
        lecturer_index VARCHAR(50) NOT NULL REFERENCES users(index_number) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE(lecturer_index, subject_id)
    );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("lecturer_subjects table created successfully.")

if __name__ == "__main__":
    setup_db()
