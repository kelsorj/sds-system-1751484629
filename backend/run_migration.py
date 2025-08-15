"""
Script to run database migrations
"""
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from alembic import command
from alembic.config import Config

def run_migrations():
    # Get database URL from environment or use default
    db_url = os.getenv('DATABASE_URL', 'sqlite:///sds_system.db')
    
    # Set up Alembic configuration
    alembic_cfg = Config()
    alembic_cfg.set_main_option('script_location', 'database/migrations')
    alembic_cfg.set_main_option('sqlalchemy.url', db_url)
    
    try:
        # Run the migration
        command.upgrade(alembic_cfg, 'head')
        print("Database migration completed successfully.")
        return True
    except Exception as e:
        print(f"Error running migration: {str(e)}")
        return False

if __name__ == "__main__":
    if run_migrations():
        sys.exit(0)
    else:
        sys.exit(1)
