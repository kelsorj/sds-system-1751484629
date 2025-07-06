"""
Database migration to add Dotmatics integration fields
"""

import sqlite3
from pathlib import Path

def migrate_database():
    """Add new columns for Dotmatics integration"""
    
    # Get database path
    db_path = Path(__file__).parent.parent.parent / "database" / "sds_system.db"
    
    if not db_path.exists():
        print("Database file not found. Please run the application first to create the database.")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(chemicals)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add new columns if they don't exist
        if 'reg_formatted_id' not in columns:
            print("Adding reg_formatted_id column...")
            cursor.execute("ALTER TABLE chemicals ADD COLUMN reg_formatted_id VARCHAR(50)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chemicals_reg_formatted_id ON chemicals(reg_formatted_id)")
        
        if 'smiles' not in columns:
            print("Adding smiles column...")
            cursor.execute("ALTER TABLE chemicals ADD COLUMN smiles TEXT")
        
        # Commit changes
        conn.commit()
        conn.close()
        
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        return False

if __name__ == "__main__":
    migrate_database() 