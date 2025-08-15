"""
Chemicals API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from backend.api.database import get_db
from backend.core.inventory_manager import InventoryManager
from backend.utils.ghs_nfpa_translator import translator as ghs_nfpa_translator

router = APIRouter()

# Pydantic models for request/response
class ChemicalCreate(BaseModel):
    cas_number: str
    name: str
    molecular_formula: Optional[str] = None
    molecular_weight: Optional[float] = None
    purity: Optional[str] = None
    supplier: Optional[str] = None
    catalog_number: Optional[str] = None
    quantity: Optional[float] = 0.0
    unit: Optional[str] = "g"
    location: Optional[str] = None
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None
    hazard_class: Optional[str] = None
    hazard_statement: Optional[str] = None
    precautionary_statement: Optional[str] = None
    signal_word: Optional[str] = None
    notes: Optional[str] = None

class ChemicalUpdate(BaseModel):
    name: Optional[str] = None
    molecular_formula: Optional[str] = None
    molecular_weight: Optional[float] = None
    purity: Optional[str] = None
    supplier: Optional[str] = None
    catalog_number: Optional[str] = None
    location: Optional[str] = None
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None
    hazard_class: Optional[str] = None
    hazard_statement: Optional[str] = None
    precautionary_statement: Optional[str] = None
    signal_word: Optional[str] = None
    notes: Optional[str] = None

class NFPAData(BaseModel):
    nfpa_class: Optional[str] = None
    nfpa_flammability: Optional[int] = None
    fire_code_type: Optional[str] = None
    flash_point_description: Optional[str] = None
    boiling_point_description: Optional[str] = None

class ChemicalResponse(BaseModel):
    id: int
    cas_number: str
    name: str
    molecular_formula: Optional[str]
    molecular_weight: Optional[float]
    purity: Optional[str]
    supplier: Optional[str]
    catalog_number: Optional[str]
    quantity: Optional[float]
    unit: Optional[str]
    location: Optional[str]
    purchase_date: Optional[str]
    expiry_date: Optional[str]
    hazard_class: Optional[str]
    hazard_statement: Optional[str]
    precautionary_statement: Optional[str]
    signal_word: Optional[str]
    notes: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]
    flash_point_f: Optional[float] = None
    boiling_point_f: Optional[float] = None
    nfpa_data: Optional[NFPAData] = None

@router.get("/", response_model=List[ChemicalResponse])
async def get_chemicals(
    search: Optional[str] = Query(None, description="Search in name, CAS number, or molecular formula"),
    location: Optional[str] = Query(None, description="Filter by location"),
    supplier: Optional[str] = Query(None, description="Filter by supplier"),
    low_stock: bool = Query(False, description="Only show chemicals with low stock"),
    db: Session = Depends(get_db)
):
    """Get all chemicals with optional filtering"""
    inventory_manager = InventoryManager(db)
    chemicals = inventory_manager.search_chemicals(
        search_term=search,
        location=location,
        supplier=supplier,
        low_stock=low_stock
    )
    
    # Add NFPA data to each chemical
    return [_add_nfpa_data(chem) for chem in chemicals]

def _add_nfpa_data(chemical: Dict[str, Any]) -> Dict[str, Any]:
    """Add NFPA data to chemical response"""
    if not chemical:
        return chemical
    
    # Get GHS category from hazard_class if available
    ghs_category = None
    if chemical.get('hazard_class'):
        # Try to extract GHS category from hazard_class
        for cat in ['Category 1', 'Category 2', 'Category 3', 'Category 4']:
            if cat in chemical['hazard_class']:
                ghs_category = cat
                break
    
    # If we have a GHS category, get NFPA data
    if ghs_category:
        nfpa_data = ghs_nfpa_translator.translate_ghs_to_nfpa(
            ghs_category=ghs_category,
            flash_point_f=chemical.get('flash_point_f'),
            boiling_point_f=chemical.get('boiling_point_f')
        )
        chemical['nfpa_data'] = nfpa_data
    
    return chemical

@router.get("/{cas_number}", response_model=ChemicalResponse)
async def get_chemical(cas_number: str, db: Session = Depends(get_db)):
    """Get a specific chemical by CAS number"""
    inventory_manager = InventoryManager(db)
    chemical = inventory_manager.get_chemical(cas_number)
    
    if not chemical:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chemical with CAS {cas_number} not found"
        )
    
    # Add NFPA data to the response
    chemical = _add_nfpa_data(chemical)
    
    return chemical

@router.post("/", response_model=Dict[str, Any])
async def create_chemical(
    chemical_data: ChemicalCreate,
    db: Session = Depends(get_db)
):
    """Create a new chemical"""
    inventory_manager = InventoryManager(db)
    
    # Convert string dates to datetime objects if provided
    data_dict = chemical_data.dict()
    if data_dict.get('purchase_date'):
        from datetime import datetime
        try:
            data_dict['purchase_date'] = datetime.fromisoformat(data_dict['purchase_date'].replace('Z', '+00:00'))
        except:
            data_dict['purchase_date'] = None
    
    if data_dict.get('expiry_date'):
        from datetime import datetime
        try:
            data_dict['expiry_date'] = datetime.fromisoformat(data_dict['expiry_date'].replace('Z', '+00:00'))
        except:
            data_dict['expiry_date'] = None
    
    result = inventory_manager.add_chemical(data_dict)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result

@router.put("/{cas_number}", response_model=Dict[str, Any])
async def update_chemical(
    cas_number: str,
    chemical_data: ChemicalUpdate,
    db: Session = Depends(get_db)
):
    """Update a chemical"""
    inventory_manager = InventoryManager(db)
    
    # Convert string dates to datetime objects if provided
    data_dict = chemical_data.dict(exclude_unset=True)
    if data_dict.get('purchase_date'):
        from datetime import datetime
        try:
            data_dict['purchase_date'] = datetime.fromisoformat(data_dict['purchase_date'].replace('Z', '+00:00'))
        except:
            data_dict['purchase_date'] = None
    
    if data_dict.get('expiry_date'):
        from datetime import datetime
        try:
            data_dict['expiry_date'] = datetime.fromisoformat(data_dict['expiry_date'].replace('Z', '+00:00'))
        except:
            data_dict['expiry_date'] = None
    
    result = inventory_manager.update_chemical(cas_number, data_dict)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result

@router.delete("/{cas_number}")
async def delete_chemical(cas_number: str, db: Session = Depends(get_db)):
    """Delete a chemical (soft delete by setting quantity to 0)"""
    inventory_manager = InventoryManager(db)
    
    # Instead of actually deleting, we'll set quantity to 0
    result = inventory_manager.adjust_inventory(
        cas_number=cas_number,
        quantity=0,
        unit="g",
        transaction_type="adjustment",
        user="system",
        notes="Chemical removed from inventory"
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return {"message": f"Chemical {cas_number} removed from inventory"}

@router.get("/{cas_number}/transactions")
async def get_chemical_transactions(
    cas_number: str,
    limit: int = Query(50, ge=1, le=100, description="Maximum number of transactions to return"),
    db: Session = Depends(get_db)
):
    """Get transaction history for a chemical"""
    inventory_manager = InventoryManager(db)
    transactions = inventory_manager.get_transaction_history(cas_number, limit)
    
    if not transactions and not inventory_manager.get_chemical(cas_number):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chemical with CAS {cas_number} not found"
        )
    
    return transactions

@router.get("/summary", response_model=Dict[str, Any])
async def get_chemicals_summary(db: Session = Depends(get_db)):
    """Get summary statistics for chemicals inventory"""
    inventory_manager = InventoryManager(db)
    return inventory_manager.get_inventory_summary() 