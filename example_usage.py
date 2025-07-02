#!/usr/bin/env python3
"""
Example usage script for the SDS/GHS Management System
"""

import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def example_sds_download():
    """Example: Download SDS files for common chemicals"""
    print("=== SDS Download Example ===")
    
    from backend.core.sds_manager import SDSManager
    from backend.api.database import SessionLocal
    
    # Common chemicals for testing
    cas_numbers = [
        '141-78-6',   # Ethyl acetate
        '110-82-7',   # Cyclohexane
        '67-63-0',    # Isopropanol
        '75-09-2',    # Dichloromethane
        '109-89-7'    # Diethylamine
    ]
    
    print(f"Downloading SDS files for {len(cas_numbers)} chemicals...")
    
    with SessionLocal() as db:
        sds_manager = SDSManager(db)
        result = sds_manager.download_sds_batch(cas_numbers)
        
        print(f"Download completed:")
        print(f"  - Total: {result['total']}")
        print(f"  - Downloaded: {result['downloaded']}")
        print(f"  - Already existed: {result['already_exists']}")
        print(f"  - Failed: {result['failed']}")
        
        if result['details']:
            print("\nDetails:")
            for detail in result['details']:
                status = "✓" if detail['success'] else "✗"
                print(f"  {status} {detail['cas_number']}: {detail['source'] or 'failed'}")

def example_inventory_management():
    """Example: Chemical inventory management"""
    print("\n=== Inventory Management Example ===")
    
    from backend.core.inventory_manager import InventoryManager
    from backend.api.database import SessionLocal
    
    with SessionLocal() as db:
        inventory = InventoryManager(db)
        
        # Add some chemicals to inventory
        chemicals = [
            {
                'cas_number': '141-78-6',
                'name': 'Ethyl acetate',
                'molecular_formula': 'C4H8O2',
                'molecular_weight': 88.11,
                'purity': '99.5%',
                'supplier': 'Sigma-Aldrich',
                'catalog_number': '270989',
                'quantity': 2.5,
                'unit': 'L',
                'location': 'Lab A - Shelf 1',
                'notes': 'Analytical grade'
            },
            {
                'cas_number': '110-82-7',
                'name': 'Cyclohexane',
                'molecular_formula': 'C6H12',
                'molecular_weight': 84.16,
                'purity': '99.9%',
                'supplier': 'Fisher Scientific',
                'catalog_number': 'C298-4',
                'quantity': 1.0,
                'unit': 'L',
                'location': 'Lab A - Shelf 2',
                'notes': 'HPLC grade'
            }
        ]
        
        print("Adding chemicals to inventory...")
        for chemical_data in chemicals:
            result = inventory.add_chemical(chemical_data)
            if result['success']:
                print(f"  ✓ Added {chemical_data['name']}")
            else:
                print(f"  ✗ Failed to add {chemical_data['name']}: {result['error']}")
        
        # Get inventory summary
        summary = inventory.get_inventory_summary()
        print(f"\nInventory Summary:")
        print(f"  - Total chemicals: {summary['total_chemicals']}")
        print(f"  - With stock: {summary['chemicals_with_stock']}")
        print(f"  - No stock: {summary['chemicals_no_stock']}")
        print(f"  - Low stock: {summary['low_stock']}")
        print(f"  - Expiring soon: {summary['expiring_soon']}")
        
        # Search for chemicals
        print("\nSearching for 'ethyl'...")
        search_results = inventory.search_chemicals(search_term='ethyl')
        for chemical in search_results:
            print(f"  - {chemical['name']} ({chemical['cas_number']}): {chemical['quantity']} {chemical['unit']}")

def example_api_usage():
    """Example: Using the API endpoints"""
    print("\n=== API Usage Example ===")
    
    import requests
    import json
    
    base_url = "http://localhost:8000/api"
    
    # Test health check
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✓ API is healthy: {health_data['app_name']} v{health_data['version']}")
        else:
            print("✗ API health check failed")
            return
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to API. Make sure the server is running.")
        print("  Start the server with: python start.py")
        return
    
    # Get system info
    response = requests.get(f"{base_url}/system/info")
    if response.status_code == 200:
        system_info = response.json()
        print(f"✓ System info: {system_info['company_name']}")
        print(f"  GHS Version: {system_info['ghs_version']}")
        print(f"  SDS Sources: {', '.join(system_info['sds_sources'])}")
    
    # Get SDS sources
    response = requests.get(f"{base_url}/sds/sources")
    if response.status_code == 200:
        sources = response.json()
        print(f"✓ Available SDS sources: {', '.join(sources['sources'])}")

def main():
    """Main example function"""
    print("SDS/GHS Management System - Example Usage")
    print("=" * 50)
    
    # Check if database exists, if not create it
    from backend.database.init_db import main as init_db
    print("Initializing database...")
    init_db()
    
    # Run examples
    example_sds_download()
    example_inventory_management()
    example_api_usage()
    
    print("\n" + "=" * 50)
    print("Example completed!")
    print("\nTo start the web interface:")
    print("  python start.py")
    print("\nThen visit:")
    print("  http://localhost:8000/api/docs")

if __name__ == "__main__":
    from backend.core.sds_manager import SDSManager
    from backend.database.database import get_db_session  # Adjust if your session getter is named differently

    db = get_db_session()
    sds_manager = SDSManager(db)
    cas_number = '872-85-5'  # Example CAS number
    print(f"Attempting SDS download for CAS: {cas_number}")
    result = sds_manager.download_sds_batch([cas_number])
    print("Download result:", result)
    # Check if file exists
    import os
    from config.settings import settings
    file_path = os.path.join(settings.SDS_FILES_DIR, f"{cas_number}-SDS.pdf")
    print("File exists:", os.path.exists(file_path))

    main() 