"""
Database initialization script for the SDS/GHS Management System
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.models import Base
from config.settings import settings
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_database():
    """Create the database and tables"""
    print("Creating database...")
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("Database created successfully!")

def create_default_user():
    """Create a default admin user"""
    print("Creating default admin user...")
    
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        from backend.database.models import User
        
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        if not admin_user:
            # Create default admin user
            hashed_password = pwd_context.hash("admin123")
            admin_user = User(
                username="admin",
                email="admin@company.com",
                hashed_password=hashed_password,
                full_name="System Administrator",
                role="admin"
            )
            
            db.add(admin_user)
            db.commit()
            print("Default admin user created!")
            print("Username: admin")
            print("Password: admin123")
            print("Please change the password after first login!")
        else:
            print("Admin user already exists.")

def main():
    """Main initialization function"""
    print("Initializing SDS/GHS Management System Database...")
    
    try:
        # Create database and tables
        create_database()
        
        # Create default user
        create_default_user()
        
        print("\nDatabase initialization completed successfully!")
        print(f"Database location: {settings.DATABASE_URL}")
        
    except Exception as e:
        print(f"Error during database initialization: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 