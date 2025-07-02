"""
Inventory Management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from backend.api.database import get_db
from backend.core.inventory_manager import InventoryManager

router = APIRouter()

# Pydantic models
class InventoryAdjustment(BaseModel):
    quantity: float
    unit: str
    transaction_type: str  # 'in', 'out', 'adjustment'
    user: Optional[str] = "system"
    notes: Optional[str] = None

class InventorySummary(BaseModel):
    total_chemicals: int
    chemicals_with_stock: int
    chemicals_no_stock: int
    expiring_soon: int
    low_stock: int

@router.get("/summary", response_model=InventorySummary)
async def get_inventory_summary(db: Session = Depends(get_db)):
    """Get inventory summary statistics"""
    inventory_manager = InventoryManager(db)
    summary = inventory_manager.get_inventory_summary()
    return summary

@router.post("/{cas_number}/adjust")
async def adjust_inventory(
    cas_number: str,
    adjustment: InventoryAdjustment,
    db: Session = Depends(get_db)
):
    """Adjust chemical inventory quantity"""
    inventory_manager = InventoryManager(db)
    
    if adjustment.transaction_type not in ['in', 'out', 'adjustment']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction type. Must be 'in', 'out', or 'adjustment'"
        )
    
    result = inventory_manager.adjust_inventory(
        cas_number=cas_number,
        quantity=adjustment.quantity,
        unit=adjustment.unit,
        transaction_type=adjustment.transaction_type,
        user=adjustment.user,
        notes=adjustment.notes
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result

@router.get("/{cas_number}/transactions")
async def get_inventory_transactions(
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

@router.get("/low-stock")
async def get_low_stock_chemicals(db: Session = Depends(get_db)):
    """Get chemicals with low stock"""
    inventory_manager = InventoryManager(db)
    chemicals = inventory_manager.search_chemicals(low_stock=True)
    return chemicals

@router.get("/expiring-soon")
async def get_expiring_chemicals(
    days: int = Query(30, ge=1, le=365, description="Number of days to look ahead"),
    db: Session = Depends(get_db)
):
    """Get chemicals expiring within specified days"""
    from backend.database.models import Chemical
    from datetime import datetime, timedelta
    
    try:
        expiry_date = datetime.now() + timedelta(days=days)
        chemicals = db.query(Chemical).filter(
            Chemical.expiry_date <= expiry_date,
            Chemical.expiry_date.isnot(None)
        ).all()
        
        inventory_manager = InventoryManager(db)
        return [inventory_manager.get_chemical(chem.cas_number) for chem in chemicals if inventory_manager.get_chemical(chem.cas_number)]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting expiring chemicals: {str(e)}"
        )

@router.get("/locations")
async def get_inventory_locations(db: Session = Depends(get_db)):
    """Get all unique inventory locations"""
    from backend.database.models import Chemical
    from sqlalchemy import distinct
    
    try:
        locations = db.query(distinct(Chemical.location)).filter(
            Chemical.location.isnot(None),
            Chemical.location != ""
        ).all()
        
        return [location[0] for location in locations if location[0]]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting locations: {str(e)}"
        )

@router.get("/suppliers")
async def get_inventory_suppliers(db: Session = Depends(get_db)):
    """Get all unique suppliers"""
    from backend.database.models import Chemical
    from sqlalchemy import distinct
    
    try:
        suppliers = db.query(distinct(Chemical.supplier)).filter(
            Chemical.supplier.isnot(None),
            Chemical.supplier != ""
        ).all()
        
        return [supplier[0] for supplier in suppliers if supplier[0]]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting suppliers: {str(e)}"
        ) 