import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database.db import get_connection

def alter_db():
    conn = get_connection()
    cur = conn.cursor()
    
    # Check existing columns and alter table
    cur.execute("""
    ALTER TABLE login_requests 
    ADD COLUMN IF NOT EXISTS index_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS nic VARCHAR(20),
    ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS batch_year INTEGER;
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("login_requests table altered successfully.")

if __name__ == "__main__":
    alter_db()
