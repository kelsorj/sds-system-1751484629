# Company SDS/GHS Management System

A comprehensive Safety Data Sheet (SDS) and Globally Harmonized System (GHS) management system for chemical safety compliance.

## Features

- **Automated SDS Download**: Download SDS files from multiple sources using CAS numbers
- **GHS Classification**: Automatic GHS hazard classification and labeling
- **Chemical Inventory Management**: Track chemicals, quantities, and locations
- **Compliance Reporting**: Generate compliance reports for regulatory requirements
- **Web Interface**: User-friendly web interface for managing chemical data
- **API Integration**: RESTful API for integration with other systems
- **Multi-threaded Downloads**: Fast parallel downloading of SDS files
- **Database Storage**: Persistent storage of chemical and SDS data

## System Architecture

```
sds-company-system/
├── backend/                 # Python backend services
│   ├── api/                # REST API endpoints
│   ├── core/               # Core SDS/GHS functionality
│   ├── database/           # Database models and migrations
│   └── utils/              # Utility functions
├── frontend/               # Web interface
│   ├── src/                # React application
│   └── public/             # Static assets
├── database/               # Database files
├── sds_files/              # Downloaded SDS files
├── config/                 # Configuration files
└── docs/                   # Documentation
```

## Quick Start

1. **Clone and Setup**:
   ```bash
   git clone <your-repo-url>
   cd sds-company-system
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Initialize Database**:
   ```bash
   python -m backend.database.init_db
   ```

3. **Start the Application**:
   ```bash
   python -m backend.main
   ```

4. **Access Web Interface**:
   Open http://localhost:8000 in your browser

## Usage Examples

### Download SDS for Chemicals
```python
from backend.core.sds_manager import SDSManager

sds_manager = SDSManager()
cas_numbers = ['141-78-6', '110-82-7', '67-63-0']
results = sds_manager.download_sds_batch(cas_numbers)
```

### Add Chemical to Inventory
```python
from backend.core.inventory_manager import InventoryManager

inventory = InventoryManager()
chemical_data = {
    'cas_number': '141-78-6',
    'name': 'Ethyl acetate',
    'quantity': 5.0,
    'unit': 'L',
    'location': 'Lab A - Shelf 3',
    'purchase_date': '2024-01-15'
}
inventory.add_chemical(chemical_data)
```

### Generate Compliance Report
```python
from backend.core.reporting import ComplianceReporter

reporter = ComplianceReporter()
report = reporter.generate_chemical_inventory_report()
reporter.export_to_pdf(report, 'chemical_inventory_report.pdf')
```

## API Endpoints

- `GET /api/chemicals` - List all chemicals
- `POST /api/chemicals` - Add new chemical
- `GET /api/chemicals/{cas_number}` - Get chemical details
- `POST /api/sds/download` - Download SDS for CAS number
- `GET /api/reports/inventory` - Generate inventory report
- `GET /api/ghs/classify/{cas_number}` - Get GHS classification

## Configuration

Edit `config/settings.py` to configure:
- Database connection
- SDS download sources
- File storage paths
- API settings
- Company information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact your system administrator or create an issue in the repository. 

## Maintenance

To keep the system running optimally:

1. **Database Backup**: Schedule weekly backups of the chemical database
2. **SDS Updates**: Check for updated SDS documents quarterly
3. **Security Patches**: Apply security updates monthly
4. **Usage Logs**: Review access and error logs monthly
5. **Performance Monitoring**: Monitor system performance and optimize as needed