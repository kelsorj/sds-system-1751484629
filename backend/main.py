"""
Main FastAPI application for the SDS/GHS Management System
"""

import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from config.settings import settings
from backend.database.models import Base
from backend.database.init_db import create_database
from backend.core.sds_manager import SDSManager
from backend.core.inventory_manager import InventoryManager
from backend.api.database import get_db
from backend.api import chemicals, sds, inventory, reports, auth, bulk_import

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="A comprehensive Safety Data Sheet (SDS) and Globally Harmonized System (GHS) management system",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chemicals.router, prefix="/api/chemicals", tags=["Chemicals"])
app.include_router(sds.router, prefix="/api/sds", tags=["SDS Management"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(bulk_import.router, prefix="/api/bulk-import", tags=["Bulk Import"])

# Mount static files - fix the path to be relative to the current directory
app.mount("/static", StaticFiles(directory="frontend/public"), name="static")

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Ensure database exists
    try:
        create_database()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization error: {e}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
        "company": settings.COMPANY_NAME,
        "frontend": "/static/index.html"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

@app.get("/api/system/info")
async def system_info():
    """Get system information"""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "company_name": settings.COMPANY_NAME,
        "company_email": settings.COMPANY_EMAIL,
        "ghs_version": settings.GHS_VERSION,
        "sds_sources": settings.SDS_SOURCES,
        "max_download_threads": settings.MAX_DOWNLOAD_THREADS
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    ) 