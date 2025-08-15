"""
Database models for the SDS/GHS Management System
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()

class Chemical(Base):
    """Chemical inventory model"""
    __tablename__ = "chemicals"
    
    id = Column(Integer, primary_key=True, index=True)
    cas_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    molecular_formula = Column(String(100))
    molecular_weight = Column(Float)
    purity = Column(String(50))
    supplier = Column(String(255))
    catalog_number = Column(String(100))
    
    # Inventory information
    quantity = Column(Float)
    unit = Column(String(20))
    location = Column(String(255))
    purchase_date = Column(DateTime)
    expiry_date = Column(DateTime)
    
    # Dotmatics integration fields
    reg_formatted_id = Column(String(50), unique=True, index=True)  # Internal ID from Dotmatics
    smiles = Column(Text)  # Chemical structure in SMILES format
    
    # Safety information
    hazard_class = Column(String(100))
    hazard_statement = Column(Text)
    precautionary_statement = Column(Text)
    signal_word = Column(String(20))
    
    # Physical properties for NFPA classification
    flash_point_f = Column(Float, comment='Flash point in Fahrenheit')
    boiling_point_f = Column(Float, comment='Boiling point in Fahrenheit')
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    notes = Column(Text)
    
    # Relationships
    sds_files = relationship("SDSFile", back_populates="chemical")
    ghs_classifications = relationship("GHSClassification", back_populates="chemical")

class SDSFile(Base):
    """SDS file model"""
    __tablename__ = "sds_files"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer)
    download_date = Column(DateTime, default=func.now())
    source = Column(String(100))  # chemblink, fisher, etc.
    version = Column(String(50))
    language = Column(String(10), default="en")
    
    # File metadata
    checksum = Column(String(64))
    is_valid = Column(Boolean, default=True)
    
    # Relationships
    chemical = relationship("Chemical", back_populates="sds_files")

class GHSClassification(Base):
    """GHS hazard classification model"""
    __tablename__ = "ghs_classifications"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"), nullable=False)
    
    # Physical hazards
    explosive = Column(Boolean, default=False)
    flammable = Column(Boolean, default=False)
    oxidizing = Column(Boolean, default=False)
    corrosive = Column(Boolean, default=False)
    toxic = Column(Boolean, default=False)
    
    # Health hazards
    acute_toxicity = Column(String(20))
    skin_corrosion = Column(String(20))
    serious_eye_damage = Column(String(20))
    respiratory_sensitization = Column(String(20))
    germ_cell_mutagenicity = Column(String(20))
    carcinogenicity = Column(String(20))
    reproductive_toxicity = Column(String(20))
    
    # Environmental hazards
    aquatic_toxicity = Column(String(20))
    
    # Hazard statements (H-codes)
    hazard_statements = Column(JSON)
    
    # Precautionary statements (P-codes)
    precautionary_statements = Column(JSON)
    
    # Signal word
    signal_word = Column(String(20))  # Danger, Warning
    
    # GHS pictograms (e.g., ["GHS02", "GHS07"])
    pictograms = Column(JSON)
    # GHS hazard classes (e.g., ["Flam. Liq. 2", "Carc. 1A"])
    hazard_classes = Column(JSON)
    
    # Classification date
    classified_at = Column(DateTime, default=func.now())
    classification_source = Column(String(100))
    
    # Relationships
    chemical = relationship("Chemical", back_populates="ghs_classifications")

class InventoryTransaction(Base):
    """Chemical inventory transaction model"""
    __tablename__ = "inventory_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"), nullable=False)
    
    transaction_type = Column(String(20), nullable=False)  # in, out, adjustment
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    previous_quantity = Column(Float)
    new_quantity = Column(Float)
    
    location = Column(String(255))
    user = Column(String(100))
    notes = Column(Text)
    
    transaction_date = Column(DateTime, default=func.now())
    
    # Relationships
    chemical = relationship("Chemical")

class Report(Base):
    """Generated reports model"""
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(50), nullable=False)  # inventory, compliance, etc.
    report_name = Column(String(255), nullable=False)
    file_path = Column(String(500))
    file_size = Column(Integer)
    
    parameters = Column(JSON)  # Report parameters
    generated_by = Column(String(100))
    generated_at = Column(DateTime, default=func.now())
    
    status = Column(String(20), default="completed")  # pending, completed, failed

class User(Base):
    """User model for authentication"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), default="user")  # admin, user, viewer
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime)

class AuditLog(Base):
    """Audit log for tracking changes"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(50), nullable=False)  # create, update, delete, download
    table_name = Column(String(50), nullable=False)
    record_id = Column(Integer)
    
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    timestamp = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User") 