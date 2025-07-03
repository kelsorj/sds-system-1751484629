"""
Configuration settings for the SDS/GHS Management System
"""

import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Company SDS/GHS Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    # Using remote PostgreSQL database for better performance with large numbers of molecules
    DATABASE_URL: str = "postgresql://postgres:postgres@ekmbalps1.corp.eikontx.com:5432/postgres"
    
    # File Storage
    SDS_FILES_DIR: str = "./sds_files"
    REPORTS_DIR: str = "./reports"
    UPLOAD_DIR: str = "./uploads"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Company Information
    COMPANY_NAME: str = "Your Company Name"
    COMPANY_ADDRESS: str = "Your Company Address"
    COMPANY_PHONE: str = "Your Company Phone"
    COMPANY_EMAIL: str = "safety@yourcompany.com"
    
    # SDS Download Sources (from original find_sds)
    SDS_SOURCES: List[str] = [
        "chemblink",
        "vwr", 
        "fisher",
        "tci",
        "chemicalsafety",
        "fluorochem"
    ]
    
    # Download Settings
    MAX_DOWNLOAD_THREADS: int = 10
    DOWNLOAD_TIMEOUT: int = 20
    MAX_RETRIES: int = 3
    
    # GHS Settings
    GHS_VERSION: str = "Rev.10 (2023)"
    DEFAULT_LANGUAGE: str = "en"
    
    # Reporting
    REPORT_TEMPLATE_DIR: str = "./templates"
    DEFAULT_REPORT_FORMAT: str = "pdf"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/sds_system.log"
    
    # API Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Ensure directories exist
def create_directories():
    """Create necessary directories if they don't exist"""
    directories = [
        settings.SDS_FILES_DIR,
        settings.REPORTS_DIR,
        settings.UPLOAD_DIR,
        settings.REPORT_TEMPLATE_DIR,
        os.path.dirname(settings.LOG_FILE),
        "./database"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)

# Initialize directories
create_directories() 