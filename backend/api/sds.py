"""
SDS Management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
from sqlalchemy import func

from backend.api.database import get_db
from backend.core.sds_manager import SDSManager

router = APIRouter()

# Pydantic models
class SDSDownloadRequest(BaseModel):
    cas_numbers: List[str]
    pool_size: Optional[int] = None

class SDSDownloadResponse(BaseModel):
    total: int
    downloaded: int
    failed: int
    already_exists: int
    details: List[Dict[str, Any]]

@router.post("/download", response_model=SDSDownloadResponse)
async def download_sds(
    request: SDSDownloadRequest,
    db: Session = Depends(get_db)
):
    """Download SDS files for a list of CAS numbers"""
    sds_manager = SDSManager(db)
    
    if not request.cas_numbers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No CAS numbers provided"
        )
    
    # Validate CAS numbers format
    for cas in request.cas_numbers:
        if not cas or len(cas.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty CAS number provided"
            )
    
    result = sds_manager.download_sds_batch(
        cas_list=request.cas_numbers,
        pool_size=request.pool_size
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    return result

@router.get("/{cas_number}")
async def get_sds_info(cas_number: str, db: Session = Depends(get_db)):
    """Get information about SDS files for a CAS number"""
    sds_manager = SDSManager(db)
    sds_info = sds_manager.get_sds_info(cas_number)
    
    if not sds_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No SDS information found for CAS {cas_number}"
        )
    
    return sds_info

@router.get("/{cas_number}/download")
async def download_sds_file(
    cas_number: str,
    db: Session = Depends(get_db)
):
    """Download a specific SDS file"""
    sds_manager = SDSManager(db)
    sds_info = sds_manager.get_sds_info(cas_number)
    
    if not sds_info or not sds_info.get("sds_files"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No SDS file found for CAS {cas_number}"
        )
    
    # Get the most recent SDS file
    sds_file = sds_info["sds_files"][0]
    file_path = sds_file["file_name"]
    full_path = os.path.join(sds_manager.download_path, file_path)
    
    if not os.path.exists(full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SDS file not found on disk for CAS {cas_number}"
        )
    
    return FileResponse(
        path=full_path,
        filename=file_path,
        media_type="application/pdf"
    )

@router.get("/{cas_number}/validate")
async def validate_sds_file(cas_number: str, db: Session = Depends(get_db)):
    """Validate an SDS file"""
    sds_manager = SDSManager(db)
    sds_info = sds_manager.get_sds_info(cas_number)
    
    if not sds_info or not sds_info.get("sds_files"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No SDS file found for CAS {cas_number}"
        )
    
    # Get the most recent SDS file
    sds_file = sds_info["sds_files"][0]
    file_path = sds_file["file_name"]
    full_path = os.path.join(sds_manager.download_path, file_path)
    
    validation_result = sds_manager.validate_sds_file(full_path)
    
    return {
        "cas_number": cas_number,
        "file_name": file_path,
        "validation": validation_result
    }

@router.get("/sources")
async def get_sds_sources():
    """Get available SDS download sources"""
    from config.settings import settings
    
    return {
        "sources": settings.SDS_SOURCES,
        "description": "Available sources for SDS downloads"
    }

@router.get("/stats/summary")
async def get_sds_stats(db: Session = Depends(get_db)):
    """Get SDS download statistics"""
    from backend.database.models import SDSFile, Chemical
    
    try:
        total_sds_files = db.query(SDSFile).count()
        total_chemicals = db.query(Chemical).count()
        chemicals_with_sds = db.query(Chemical).join(SDSFile).distinct().count()
        
        # Count by source
        source_stats = {}
        sources = db.query(SDSFile.source, func.count(SDSFile.id)).group_by(SDSFile.source).all()
        for source, count in sources:
            source_stats[source or "unknown"] = count
        
        return {
            "total_sds_files": total_sds_files,
            "total_chemicals": total_chemicals,
            "chemicals_with_sds": chemicals_with_sds,
            "chemicals_without_sds": total_chemicals - chemicals_with_sds,
            "coverage_percentage": round((chemicals_with_sds / total_chemicals * 100) if total_chemicals > 0 else 0, 2),
            "sources": source_stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting SDS statistics: {str(e)}"
        )

@router.post("/{cas_number}/extract-ghs")
async def extract_ghs_from_sds(
    cas_number: str,
    db: Session = Depends(get_db)
):
    """Extract GHS info from the SDS PDF for a CAS number and store it in the database"""
    sds_manager = SDSManager(db)
    sds_info = sds_manager.get_sds_info(cas_number)
    if not sds_info or not sds_info.get("sds_files"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No SDS file found for CAS {cas_number}"
        )
    # Use the most recent SDS file
    sds_file = sds_info["sds_files"][0]
    file_path = sds_file["file_name"]
    full_path = os.path.join(sds_manager.download_path, file_path)
    result = sds_manager.extract_and_store_ghs_from_pdf(cas_number, full_path)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Failed to extract GHS info")
        )
    return {"message": "GHS info extracted and stored", "ghs": result.get("ghs")} 