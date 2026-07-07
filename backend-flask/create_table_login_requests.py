import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database.db import get_connection

def setup_db():
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS login_requests (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        user_id VARCHAR(50),
        role VARCHAR(20) NOT NULL DEFAULT 'Student',
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("login_requests table created successfully.")

if __name__ == "__main__":
    setup_db()
