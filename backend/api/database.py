"""
Database connection utilities for the API
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config.settings import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    # SQLite-specific parameter not needed for PostgreSQL
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    # Add PostgreSQL specific parameters for better performance
    pool_pre_ping=True,
    pool_size=10,
    pool_recycle=3600
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 