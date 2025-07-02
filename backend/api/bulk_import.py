"""
Bulk Import API endpoints for Dotmatics CSV import
"""

import csv
import io
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.api.database import get_db
from backend.core.inventory_manager import InventoryManager
from backend.core.sds_manager import SDSManager

logger = logging.getLogger("uvicorn")

router = APIRouter()

class ImportResult(BaseModel):
    total_records: int
    successful_imports: int
    failed_imports: int
    sds_downloads: int
    errors: List[str]

@router.post("/upload-csv", response_model=ImportResult)
async def upload_dotmatics_csv(
    file: UploadFile = File(...),
    download_sds: bool = True,
    db: Session = Depends(get_db)
):
    """
    Upload and process a CSV file exported from Dotmatics
    
    Expected CSV format:
    REG_FORMATTED_ID,Smiles,Cas#,Chemical Formula,IUPAC Name
    """
    
    logger.info("Bulk import endpoint called")
    print("Bulk import endpoint called", flush=True)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file"
        )
    
    try:
        # Read CSV content
        content = await file.read()
        csv_text = content.decode('utf-8')
        
        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(csv_text))
        
        inventory_manager = InventoryManager(db)
        sds_manager = SDSManager(db)
        
        total_records = 0
        successful_imports = 0
        failed_imports = 0
        sds_downloads = 0
        errors = []
        
        # Create a batch collector for CAS numbers
        cas_batch = []
        cas_batch_rows = {}  # To track which row each CAS came from
        batch_size = 20  # Process 20 CAS numbers at once - adjust as needed
        
        for row in csv_reader:
            total_records += 1
            logger.info(f"Processing row {total_records}: {row}")
            print(f"Processing row {total_records}: {row}", flush=True)
            # Normalize keys for robust field extraction
            row_normalized = {k.strip().lower(): v for k, v in row.items()}
            cas_number = row_normalized.get('cas#'.lower())
            logger.info(f"CAS number extracted: {cas_number}")
            print(f"CAS number extracted: {cas_number}", flush=True)
            try:
                # Map CSV fields to database fields
                chemical_data = {
                    'reg_formatted_id': row.get('REG_FORMATTED_ID'),
                    'smiles': row.get('Smiles'),
                    'cas_number': cas_number,
                    'molecular_formula': row.get('Chemical Formula'),
                    'name': row.get('IUPAC Name'),
                    'quantity': 0.0,  # Default quantity
                    'unit': 'g',      # Default unit
                    'notes': f"Imported from Dotmatics CSV - {file.filename}"
                }
                
                # Validate required fields
                if not chemical_data['cas_number'] or not chemical_data['name']:
                    logger.warning(f"Row {total_records}: Missing required fields (CAS# or IUPAC Name). Row: {row}")
                    print(f"Row {total_records}: Missing required fields (CAS# or IUPAC Name). Row: {row}", flush=True)
                    errors.append(f"Row {total_records}: Missing required fields (CAS# or IUPAC Name)")
                    failed_imports += 1
                    continue
                
                # Check if chemical already exists
                existing_chemical = inventory_manager.get_chemical(chemical_data['cas_number'])
                
                if existing_chemical:
                    # Update existing chemical with new information
                    update_data = {
                        'reg_formatted_id': chemical_data['reg_formatted_id'],
                        'smiles': chemical_data['smiles'],
                        'molecular_formula': chemical_data['molecular_formula'],
                        'name': chemical_data['name']
                    }
                    
                    result = inventory_manager.update_chemical(
                        chemical_data['cas_number'], 
                        update_data
                    )
                    
                    if result['success']:
                        successful_imports += 1
                    else:
                        errors.append(f"Row {total_records}: Failed to update existing chemical - {result['error']}")
                        failed_imports += 1
                else:
                    # Add new chemical
                    result = inventory_manager.add_chemical(chemical_data)
                    
                    if result['success']:
                        successful_imports += 1
                    else:
                        errors.append(f"Row {total_records}: Failed to add chemical - {result['error']}")
                        failed_imports += 1
                        continue
                
                # Add CAS numbers to batch if SDS download is requested and chemical was successfully processed
                if download_sds and chemical_data['cas_number'] and successful_imports > 0:
                    # Check if SDS already exists for this chemical
                    sds_info = sds_manager.get_sds_info(chemical_data['cas_number'])
                    has_sds = sds_info and sds_info.get('sds_files')
                    
                    if not has_sds:
                        # Add to the batch for processing
                        cas_batch.append(chemical_data['cas_number'])
                        cas_batch_rows[chemical_data['cas_number']] = total_records
                        
                        # Process batch when it reaches the desired size
                        if len(cas_batch) >= batch_size:
                            logger.info(f"Processing batch of {len(cas_batch)} SDS downloads")
                            print(f"Processing batch of {len(cas_batch)} SDS downloads", flush=True)
                            batch_result = process_cas_batch(cas_batch, cas_batch_rows, sds_manager)
                            sds_downloads += batch_result['downloaded']
                            errors.extend(batch_result['errors'])
                            cas_batch = []
                            cas_batch_rows = {}
                    else:
                        logger.info(f"SDS already exists for CAS: {chemical_data['cas_number']}")
                        print(f"SDS already exists for CAS: {chemical_data['cas_number']}", flush=True)
            except Exception as e:
                logger.error(f"Row {total_records}: Processing error - {str(e)}")
                print(f"Row {total_records}: Processing error - {str(e)}", flush=True)
                errors.append(f"Row {total_records}: Processing error - {str(e)}")
                failed_imports += 1
        
        # Process any remaining CAS numbers in the batch
        if cas_batch:
            logger.info(f"Processing remaining batch of {len(cas_batch)} SDS downloads")
            print(f"Processing remaining batch of {len(cas_batch)} SDS downloads", flush=True)
            batch_result = process_cas_batch(cas_batch, cas_batch_rows, sds_manager)
            sds_downloads += batch_result['downloaded']
            errors.extend(batch_result['errors'])
            
        return ImportResult(
            total_records=total_records,
            successful_imports=successful_imports,
            failed_imports=failed_imports,
            sds_downloads=sds_downloads,
            errors=errors[:10]  # Limit to first 10 errors to avoid huge responses
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing CSV file: {str(e)}"
        )

def process_cas_batch(cas_batch, cas_batch_rows, sds_manager):
    """Process a batch of CAS numbers for SDS download
    
    Args:
        cas_batch: List of CAS numbers to download SDS for
        cas_batch_rows: Dictionary mapping CAS numbers to row numbers
        sds_manager: SDSManager instance
        
    Returns:
        Dict with download results and errors
    """
    result = {
        "downloaded": 0,
        "errors": []
    }
    
    try:
        logger.info(f"Downloading SDS batch for {len(cas_batch)} chemicals")
        print(f"Starting batch download of {len(cas_batch)} SDS files...", flush=True)
        
        sds_result = sds_manager.download_sds_batch(cas_batch)
        
        # Process results
        for detail in sds_result.get('details', []):
            cas = detail.get('cas_number')
            row = cas_batch_rows.get(cas, 'Unknown')
            
            if detail.get('success'):
                result["downloaded"] += 1
            else:
                error_msg = detail.get('error', 'Unknown error')
                result["errors"].append(f"Row {row}: SDS download failed - {error_msg}")
                
    except Exception as e:
        logger.error(f"Exception during batch SDS download: {e}")
        print(f"Exception during batch SDS download: {e}", flush=True)
        for cas in cas_batch:
            row = cas_batch_rows.get(cas, 'Unknown')
            result["errors"].append(f"Row {row}: SDS batch download error - {str(e)}")
    
    return result


@router.get("/template")
async def get_csv_template():
    """Get a CSV template for Dotmatics export"""
    template = """REG_FORMATTED_ID,Smiles,Cas#,Chemical Formula,IUPAC Name
ERX-0000306,O=Cc1ccncc1,872-85-5,C6H5NO,isonicotinaldehyde
ERX-0000330,Nc1cccc(c1)-c1ccccc1,2243-47-2,C12H11N,(3-biphenylyl)amine"""
    
    return {
        "template": template,
        "description": "CSV template for Dotmatics export. Required columns: REG_FORMATTED_ID, Smiles, Cas#, Chemical Formula, IUPAC Name"
    } 