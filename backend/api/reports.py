"""
Reports API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
from datetime import datetime

from backend.api.database import get_db
from backend.core.inventory_manager import InventoryManager

router = APIRouter()

# Pydantic models
class ReportRequest(BaseModel):
    report_type: str  # 'inventory', 'compliance', 'expiring', 'low_stock'
    format: str = "pdf"  # 'pdf', 'csv', 'json'
    filters: Optional[Dict[str, Any]] = None

@router.post("/generate")
async def generate_report(
    request: ReportRequest,
    db: Session = Depends(get_db)
):
    """Generate a report"""
    inventory_manager = InventoryManager(db)
    
    if request.report_type not in ['inventory', 'compliance', 'expiring', 'low_stock']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type"
        )
    
    if request.format not in ['pdf', 'csv', 'json']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid format. Must be 'pdf', 'csv', or 'json'"
        )
    
    try:
        if request.report_type == 'inventory':
            data = inventory_manager.search_chemicals()
        elif request.report_type == 'low_stock':
            data = inventory_manager.search_chemicals(low_stock=True)
        elif request.report_type == 'expiring':
            days = request.filters.get('days', 30) if request.filters else 30
            from backend.database.models import Chemical
            from datetime import timedelta
            expiry_date = datetime.now() + timedelta(days=days)
            chemicals = db.query(Chemical).filter(
                Chemical.expiry_date <= expiry_date,
                Chemical.expiry_date.isnot(None)
            ).all()
            data = [inventory_manager.get_chemical(chem.cas_number) for chem in chemicals if inventory_manager.get_chemical(chem.cas_number)]
        else:  # compliance
            data = inventory_manager.search_chemicals()
        
        # Generate report file
        report_file = generate_report_file(data, request.report_type, request.format)
        
        return {
            "success": True,
            "report_type": request.report_type,
            "format": request.format,
            "record_count": len(data),
            "file_path": report_file,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating report: {str(e)}"
        )

@router.get("/download/{filename}")
async def download_report(filename: str):
    """Download a generated report"""
    from config.settings import settings
    
    file_path = os.path.join(settings.REPORTS_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file not found"
        )
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )

@router.get("/available")
async def get_available_reports():
    """Get list of available report types"""
    return {
        "reports": [
            {
                "type": "inventory",
                "name": "Chemical Inventory Report",
                "description": "Complete inventory of all chemicals",
                "formats": ["pdf", "csv", "json"]
            },
            {
                "type": "compliance",
                "name": "Compliance Report",
                "description": "Regulatory compliance summary",
                "formats": ["pdf", "csv", "json"]
            },
            {
                "type": "expiring",
                "name": "Expiring Chemicals Report",
                "description": "Chemicals expiring within specified timeframe",
                "formats": ["pdf", "csv", "json"]
            },
            {
                "type": "low_stock",
                "name": "Low Stock Report",
                "description": "Chemicals with low inventory levels",
                "formats": ["pdf", "csv", "json"]
            }
        ]
    }

def generate_report_file(data: List[Dict], report_type: str, format: str) -> str:
    """Generate a report file in the specified format"""
    from config.settings import settings
    import csv
    import json
    
    # Ensure reports directory exists
    os.makedirs(settings.REPORTS_DIR, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{report_type}_report_{timestamp}.{format}"
    file_path = os.path.join(settings.REPORTS_DIR, filename)
    
    if format == "json":
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    elif format == "csv":
        if data:
            with open(file_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
        else:
            # Create empty CSV with headers
            with open(file_path, 'w', newline='') as f:
                f.write("No data available\n")
    
    elif format == "pdf":
        # Simple PDF generation using reportlab
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        
        doc = SimpleDocTemplate(file_path, pagesize=letter)
        elements = []
        
        # Title
        styles = getSampleStyleSheet()
        title = Paragraph(f"{report_type.title()} Report", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 12))
        
        # Summary
        summary = Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal'])
        elements.append(summary)
        elements.append(Spacer(1, 12))
        
        if data:
            # Create table
            headers = list(data[0].keys())
            table_data = [headers]
            
            for item in data:
                row = []
                for header in headers:
                    value = item.get(header, '')
                    if value is None:
                        value = ''
                    row.append(str(value))
                table_data.append(row)
            
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(table)
        else:
            no_data = Paragraph("No data available", styles['Normal'])
            elements.append(no_data)
        
        doc.build(elements)
    
    return filename 