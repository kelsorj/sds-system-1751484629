"""
Database configuration settings
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Database URL
# Default to SQLite in the project root if DATABASE_URL is not set in environment
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR.parent}/sds_system.db")
