"""
File Upload API endpoints
"""

import os
import shutil
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path

from backend.api.database import get_db
from backend.database.models import Chemical, SDSFile

router = APIRouter()

# Get base path for SDS files
SDS_FILES_PATH = Path(__file__).parent.parent.parent / "sds_files"
os.makedirs(SDS_FILES_PATH, exist_ok=True)

def calculate_checksum(file_path: str) -> str:
    """Calculate SHA-256 checksum for a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

@router.post("/sds", status_code=status.HTTP_201_CREATED)
async def upload_sds_file(
    file: UploadFile = File(...),
    cas_number: str = Form(...),
    source: Optional[str] = Form("manual_upload"),
    version: Optional[str] = Form(""),
    language: Optional[str] = Form("en"),
    db: Session = Depends(get_db)
):
    """
    Upload an SDS file for a chemical
    """
    # Check if chemical exists
    chemical = db.query(Chemical).filter(Chemical.cas_number == cas_number).first()
    if not chemical:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chemical with CAS number {cas_number} not found"
        )
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed for SDS uploads"
        )
    
    # Create unique filename with CAS number
    filename = f"{cas_number}-SDS.pdf"
    file_path = f"sds_files/{filename}"
    full_path = SDS_FILES_PATH / filename
    
    # Save file
    with open(full_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = os.path.getsize(full_path)
    
    # Calculate checksum
    checksum = calculate_checksum(full_path)
    
    # Check if a file with this checksum already exists
    existing_file = db.query(SDSFile).filter(SDSFile.checksum == checksum).first()
    if existing_file:
        # If the file already exists, just return that file info
        return {
            "id": existing_file.id,
            "file_name": existing_file.file_name,
            "file_path": existing_file.file_path,
            "file_size": existing_file.file_size,
            "checksum": existing_file.checksum,
            "download_date": existing_file.download_date,
            "status": "existing"
        }
    
    # Create new SDS file record
    sds_file = SDSFile(
        chemical_id=chemical.id,
        file_name=filename,
        file_path=file_path,
        file_size=file_size,
        checksum=checksum,
        download_date=datetime.now(),
        source=source,
        version=version,
        language=language,
        is_valid=True
    )
    
    # Save to database
    db.add(sds_file)
    db.commit()
    db.refresh(sds_file)
    
    return {
        "id": sds_file.id,
        "file_name": sds_file.file_name,
        "file_path": sds_file.file_path,
        "file_size": sds_file.file_size,
        "checksum": sds_file.checksum,
        "download_date": sds_file.download_date,
        "status": "created"
    }
