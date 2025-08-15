"""
Script to run database migrations
"""
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from config.settings import settings
from database.models import Base

def run_migration():
    """Run database migration to add new columns"""
    print("Running database migration...")
    
    # Create engine and session
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    try:
        # Create a new session
        db = SessionLocal()
        
        # Check if the columns already exist
        from sqlalchemy import inspect
        inspector = inspect(db.get_bind())
        columns = [col['name'] for col in inspector.get_columns('chemicals')]
        
        # Add columns if they don't exist
        if 'flash_point_f' not in columns:
            print("Adding flash_point_f column to chemicals table...")
            db.execute(text('ALTER TABLE chemicals ADD COLUMN flash_point_f FLOAT'))
            
        if 'boiling_point_f' not in columns:
            print("Adding boiling_point_f column to chemicals table...")
            db.execute(text('ALTER TABLE chemicals ADD COLUMN boiling_point_f FLOAT'))
        
        # Commit the changes
        db.commit()
        print("Database migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error running migration: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if run_migration():
        sys.exit(0)
    else:
        sys.exit(1)
