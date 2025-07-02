"""
Chemical Inventory Manager for the SDS/GHS System
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from backend.database.models import Chemical, InventoryTransaction, GHSClassification
from config.settings import settings

class InventoryManager:
    """Chemical inventory management system"""
    
    def __init__(self, db_session: Session):
        self.db_session = db_session
    
    def add_chemical(self, chemical_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a new chemical to the inventory
        
        Args:
            chemical_data: Dictionary containing chemical information
            
        Returns:
            Dictionary with result information
        """
        try:
            # Validate required fields
            required_fields = ['cas_number', 'name']
            for field in required_fields:
                if field not in chemical_data or not chemical_data[field]:
                    return {"success": False, "error": f"Missing required field: {field}"}
            
            # Check if chemical already exists
            existing = self.db_session.query(Chemical).filter(
                Chemical.cas_number == chemical_data['cas_number']
            ).first()
            
            if existing:
                return {"success": False, "error": f"Chemical with CAS {chemical_data['cas_number']} already exists"}
            
            # Create new chemical
            chemical = Chemical(
                cas_number=chemical_data['cas_number'],
                name=chemical_data['name'],
                molecular_formula=chemical_data.get('molecular_formula'),
                molecular_weight=chemical_data.get('molecular_weight'),
                purity=chemical_data.get('purity'),
                supplier=chemical_data.get('supplier'),
                catalog_number=chemical_data.get('catalog_number'),
                quantity=chemical_data.get('quantity', 0.0),
                unit=chemical_data.get('unit', 'g'),
                location=chemical_data.get('location'),
                purchase_date=chemical_data.get('purchase_date'),
                expiry_date=chemical_data.get('expiry_date'),
                hazard_class=chemical_data.get('hazard_class'),
                hazard_statement=chemical_data.get('hazard_statement'),
                precautionary_statement=chemical_data.get('precautionary_statement'),
                signal_word=chemical_data.get('signal_word'),
                notes=chemical_data.get('notes'),
                reg_formatted_id=chemical_data.get('reg_formatted_id'),
                smiles=chemical_data.get('smiles')
            )
            
            self.db_session.add(chemical)
            self.db_session.commit()
            
            # Create initial inventory transaction
            if chemical_data.get('quantity', 0) > 0:
                transaction = InventoryTransaction(
                    chemical_id=chemical.id,
                    transaction_type='in',
                    quantity=chemical_data['quantity'],
                    unit=chemical_data.get('unit', 'g'),
                    previous_quantity=0.0,
                    new_quantity=chemical_data['quantity'],
                    location=chemical_data.get('location'),
                    user=chemical_data.get('user', 'system'),
                    notes='Initial inventory entry'
                )
                self.db_session.add(transaction)
                self.db_session.commit()
            
            return {
                "success": True,
                "chemical_id": chemical.id,
                "message": f"Chemical {chemical_data['name']} added successfully"
            }
            
        except Exception as e:
            self.db_session.rollback()
            return {"success": False, "error": str(e)}
    
    def update_chemical(self, cas_number: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update chemical information
        
        Args:
            cas_number: CAS number of the chemical
            update_data: Dictionary with fields to update
            
        Returns:
            Dictionary with result information
        """
        try:
            chemical = self.db_session.query(Chemical).filter(
                Chemical.cas_number == cas_number
            ).first()
            
            if not chemical:
                return {"success": False, "error": f"Chemical with CAS {cas_number} not found"}
            
            # Update allowed fields
            allowed_fields = [
                'name', 'molecular_formula', 'molecular_weight', 'purity',
                'supplier', 'catalog_number', 'location', 'purchase_date',
                'expiry_date', 'hazard_class', 'hazard_statement',
                'precautionary_statement', 'signal_word', 'notes',
                'reg_formatted_id', 'smiles'
            ]
            
            for field in allowed_fields:
                if field in update_data:
                    setattr(chemical, field, update_data[field])
            
            chemical.updated_at = datetime.now()
            self.db_session.commit()
            
            return {
                "success": True,
                "message": f"Chemical {cas_number} updated successfully"
            }
            
        except Exception as e:
            self.db_session.rollback()
            return {"success": False, "error": str(e)}
    
    def adjust_inventory(self, cas_number: str, quantity: float, unit: str, 
                        transaction_type: str, user: str = "system", 
                        notes: str = None) -> Dict[str, Any]:
        """
        Adjust chemical inventory quantity
        
        Args:
            cas_number: CAS number of the chemical
            quantity: Quantity to adjust
            unit: Unit of measurement
            transaction_type: 'in', 'out', or 'adjustment'
            user: User performing the transaction
            notes: Additional notes
            
        Returns:
            Dictionary with result information
        """
        try:
            chemical = self.db_session.query(Chemical).filter(
                Chemical.cas_number == cas_number
            ).first()
            
            if not chemical:
                return {"success": False, "error": f"Chemical with CAS {cas_number} not found"}
            
            previous_quantity = chemical.quantity or 0.0
            
            # Calculate new quantity
            if transaction_type == 'in':
                new_quantity = previous_quantity + quantity
            elif transaction_type == 'out':
                new_quantity = previous_quantity - quantity
                if new_quantity < 0:
                    return {"success": False, "error": "Insufficient inventory"}
            elif transaction_type == 'adjustment':
                new_quantity = quantity
            else:
                return {"success": False, "error": "Invalid transaction type"}
            
            # Update chemical quantity
            chemical.quantity = new_quantity
            chemical.unit = unit
            
            # Create transaction record
            transaction = InventoryTransaction(
                chemical_id=chemical.id,
                transaction_type=transaction_type,
                quantity=quantity,
                unit=unit,
                previous_quantity=previous_quantity,
                new_quantity=new_quantity,
                location=chemical.location,
                user=user,
                notes=notes
            )
            
            self.db_session.add(transaction)
            self.db_session.commit()
            
            return {
                "success": True,
                "previous_quantity": previous_quantity,
                "new_quantity": new_quantity,
                "message": f"Inventory adjusted successfully"
            }
            
        except Exception as e:
            self.db_session.rollback()
            return {"success": False, "error": str(e)}
    
    def get_chemical(self, cas_number: str) -> Optional[Dict[str, Any]]:
        """
        Get chemical information
        
        Args:
            cas_number: CAS number of the chemical
            
        Returns:
            Dictionary with chemical information or None
        """
        try:
            chemical = self.db_session.query(Chemical).filter(
                Chemical.cas_number == cas_number
            ).first()
            
            if not chemical:
                return None
            
            return {
                "id": chemical.id,
                "cas_number": chemical.cas_number,
                "name": chemical.name,
                "molecular_formula": chemical.molecular_formula,
                "molecular_weight": chemical.molecular_weight,
                "purity": chemical.purity,
                "supplier": chemical.supplier,
                "catalog_number": chemical.catalog_number,
                "quantity": chemical.quantity,
                "unit": chemical.unit,
                "location": chemical.location,
                "purchase_date": chemical.purchase_date.isoformat() if chemical.purchase_date else None,
                "expiry_date": chemical.expiry_date.isoformat() if chemical.expiry_date else None,
                "hazard_class": chemical.hazard_class,
                "hazard_statement": chemical.hazard_statement,
                "precautionary_statement": chemical.precautionary_statement,
                "signal_word": chemical.signal_word,
                "notes": chemical.notes,
                "reg_formatted_id": chemical.reg_formatted_id,
                "smiles": chemical.smiles,
                "created_at": chemical.created_at.isoformat() if chemical.created_at else None,
                "updated_at": chemical.updated_at.isoformat() if chemical.updated_at else None
            }
            
        except Exception as e:
            print(f"Error getting chemical {cas_number}: {e}")
            return None
    
    def search_chemicals(self, search_term: str = None, location: str = None, 
                        supplier: str = None, low_stock: bool = False) -> List[Dict[str, Any]]:
        """
        Search chemicals with various filters
        
        Args:
            search_term: Search in name, CAS number, or molecular formula
            location: Filter by location
            supplier: Filter by supplier
            low_stock: Only show chemicals with low stock
            
        Returns:
            List of chemical dictionaries
        """
        try:
            query = self.db_session.query(Chemical)
            
            # Apply filters
            if search_term:
                search_filter = or_(
                    Chemical.name.ilike(f"%{search_term}%"),
                    Chemical.cas_number.ilike(f"%{search_term}%"),
                    Chemical.molecular_formula.ilike(f"%{search_term}%")
                )
                query = query.filter(search_filter)
            
            if location:
                query = query.filter(Chemical.location.ilike(f"%{location}%"))
            
            if supplier:
                query = query.filter(Chemical.supplier.ilike(f"%{supplier}%"))
            
            if low_stock:
                # Define low stock as less than 10% of typical quantity or less than 1 unit
                query = query.filter(
                    or_(
                        Chemical.quantity < 1.0,
                        Chemical.quantity.is_(None)
                    )
                )
            
            chemicals = query.all()
            
            return [self.get_chemical(chem.cas_number) for chem in chemicals if self.get_chemical(chem.cas_number)]
            
        except Exception as e:
            print(f"Error searching chemicals: {e}")
            return []
    
    def get_inventory_summary(self) -> Dict[str, Any]:
        """
        Get inventory summary statistics
        
        Returns:
            Dictionary with inventory statistics
        """
        try:
            total_chemicals = self.db_session.query(Chemical).count()
            chemicals_with_stock = self.db_session.query(Chemical).filter(
                Chemical.quantity > 0
            ).count()
            chemicals_no_stock = self.db_session.query(Chemical).filter(
                or_(Chemical.quantity == 0, Chemical.quantity.is_(None))
            ).count()
            
            # Get chemicals expiring soon (within 30 days)
            thirty_days_from_now = date.today() + timedelta(days=30)
            expiring_soon = self.db_session.query(Chemical).filter(
                and_(
                    Chemical.expiry_date.isnot(None),
                    Chemical.expiry_date <= thirty_days_from_now
                )
            ).count()
            
            # Get low stock chemicals
            low_stock = self.db_session.query(Chemical).filter(
                or_(
                    Chemical.quantity < 1.0,
                    Chemical.quantity.is_(None)
                )
            ).count()
            
            return {
                "total_chemicals": total_chemicals,
                "chemicals_with_stock": chemicals_with_stock,
                "chemicals_no_stock": chemicals_no_stock,
                "expiring_soon": expiring_soon,
                "low_stock": low_stock
            }
            
        except Exception as e:
            print(f"Error getting inventory summary: {e}")
            return {
                "total_chemicals": 0,
                "chemicals_with_stock": 0,
                "chemicals_no_stock": 0,
                "expiring_soon": 0,
                "low_stock": 0
            }
    
    def get_transaction_history(self, cas_number: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get transaction history for a chemical
        
        Args:
            cas_number: CAS number of the chemical
            limit: Maximum number of transactions to return
            
        Returns:
            List of transaction dictionaries
        """
        try:
            chemical = self.db_session.query(Chemical).filter(
                Chemical.cas_number == cas_number
            ).first()
            
            if not chemical:
                return []
            
            transactions = self.db_session.query(InventoryTransaction).filter(
                InventoryTransaction.chemical_id == chemical.id
            ).order_by(InventoryTransaction.transaction_date.desc()).limit(limit).all()
            
            return [
                {
                    "id": t.id,
                    "transaction_type": t.transaction_type,
                    "quantity": t.quantity,
                    "unit": t.unit,
                    "previous_quantity": t.previous_quantity,
                    "new_quantity": t.new_quantity,
                    "location": t.location,
                    "user": t.user,
                    "notes": t.notes,
                    "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None
                }
                for t in transactions
            ]
            
        except Exception as e:
            print(f"Error getting transaction history for {cas_number}: {e}")
            return [] 