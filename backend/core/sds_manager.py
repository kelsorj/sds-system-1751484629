"""
Enhanced SDS Manager for the Company SDS/GHS System
Based on the original find_sds project
"""

import os
import re
import sys
import traceback
import hashlib
from datetime import datetime
from functools import partial
from multiprocessing import Pool
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
import PyPDF2

# Import the original find_sds functions
sys.path.append(str(Path(__file__).parent.parent.parent / "find_sds"))
from find_sds.find_sds import (
    extract_download_url_from_chemblink,
    extract_download_url_from_vwr,
    extract_download_url_from_fisher,
    extract_download_url_from_tci,
    extract_download_url_from_chemicalsafety,
    extract_download_url_from_fluorochem
)

from config.settings import settings
from backend.database.models import Chemical, SDSFile, GHSClassification

class SDSManager:
    """Enhanced SDS Manager for downloading and managing SDS files"""
    
    def __init__(self, db_session: Session = None):
        self.db_session = db_session
        self.download_path = Path(settings.SDS_FILES_DIR)
        self.download_path.mkdir(parents=True, exist_ok=True)
        
        # Headers for web requests
        self.headers = {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36'
        }
    
    def download_sds_batch(self, cas_list: List[str], pool_size: int = None) -> Dict[str, Any]:
        """
        Download SDS files for a batch of CAS numbers
        
        Args:
            cas_list: List of CAS numbers
            pool_size: Number of parallel download threads
            
        Returns:
            Dictionary with download results
        """
        if not cas_list:
            return {"error": "No CAS numbers provided"}
        
        if pool_size is None:
            pool_size = settings.MAX_DOWNLOAD_THREADS
        
        print(f"Starting batch download of {len(cas_list)} SDS files...")
        
        results = {
            "total": len(cas_list),
            "downloaded": 0,
            "failed": 0,
            "already_exists": 0,
            "details": []
        }
        
        try:
            # Use multiprocessing for parallel downloads
            with Pool(pool_size) as p:
                download_results = p.map(
                    partial(SDSManager._download_single_sds_static, download_path=str(self.download_path)),
                    cas_list
                )
            
            # Process results and update DB in main process only
            for cas_nr, success, source, file_path, error_msg in download_results:
                result_detail = {
                    "cas_number": cas_nr,
                    "success": success,
                    "source": source,
                    "file_path": file_path,
                    "error": error_msg
                }
                
                if success:
                    if source == "already_exists":
                        results["already_exists"] += 1
                    else:
                        results["downloaded"] += 1
                        # Only update DB in main process
                        if self.db_session:
                            self._update_database_record(cas_nr, file_path, source)
                            # Extract GHS info after download
                            self.extract_and_store_ghs_from_pdf(cas_nr, file_path)
                else:
                    results["failed"] += 1
                
                results["details"].append(result_detail)
                
        except Exception as e:
            results["error"] = str(e)
            traceback.print_exc()
        
        print(f"Batch download completed:")
        print(f"  - Downloaded: {results['downloaded']}")
        print(f"  - Already existed: {results['already_exists']}")
        print(f"  - Failed: {results['failed']}")
        
        return results
    
    @staticmethod
    def _download_single_sds_static(cas_nr: str, download_path: str) -> Tuple[str, bool, str, str, str]:
        """
        Download a single SDS file (static version for multiprocessing)
        
        Args:
            cas_nr: CAS number
            download_path: Path to download directory
            
        Returns:
            Tuple of (cas_number, success, source, file_path, error_message)
        """
        file_name = f"{cas_nr}-SDS.pdf"
        file_path = Path(download_path) / file_name
        
        # Check if file already exists
        if file_path.exists():
            return cas_nr, True, "already_exists", str(file_path), None
        
        print(f"Searching for {file_name}...")
        
        headers = {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36'
        }
        try:
            # Try different sources in order
            sources = [
                ("chemblink", extract_download_url_from_chemblink),
                ("vwr", extract_download_url_from_vwr),
                ("fisher", extract_download_url_from_fisher),
                ("tci", extract_download_url_from_tci),
                ("chemicalsafety", extract_download_url_from_chemicalsafety),
                ("fluorochem", extract_download_url_from_fluorochem)
            ]
            
            for source_name, extract_func in sources:
                try:
                    result = extract_func(cas_nr)
                    if result:
                        sds_source, full_url = result
                        if full_url:
                            # Download the file
                            response = requests.get(
                                full_url, 
                                headers=headers, 
                                timeout=settings.DOWNLOAD_TIMEOUT
                            )
                            
                            if response.status_code == 200 and len(response.history) == 0:
                                # Save the file
                                with open(file_path, 'wb') as f:
                                    f.write(response.content)
                                
                                print(f"  ✓ Downloaded from {source_name}")
                                return cas_nr, True, source_name, str(file_path), None
                
                except Exception as e:
                    if settings.DEBUG:
                        print(f"  Error with {source_name}: {str(e)}")
                    continue
            
            # If we get here, no source worked
            return cas_nr, False, None, None, "No SDS found from any source"
            
        except Exception as e:
            return cas_nr, False, None, None, str(e)
    
    def _update_database_record(self, cas_number: str, file_path: str, source: str):
        """Update database with SDS file information"""
        try:
            # Find or create chemical record
            chemical = self.db_session.query(Chemical).filter(
                Chemical.cas_number == cas_number
            ).first()
            
            if not chemical:
                # Create basic chemical record
                chemical = Chemical(
                    cas_number=cas_number,
                    name=f"Chemical {cas_number}"  # Placeholder name
                )
                self.db_session.add(chemical)
                self.db_session.flush()  # Get the ID
            
            # Check if SDS file record already exists
            existing_sds = self.db_session.query(SDSFile).filter(
                SDSFile.chemical_id == chemical.id,
                SDSFile.file_name == f"{cas_number}-SDS.pdf"
            ).first()
            
            if not existing_sds:
                # Create SDS file record
                file_size = Path(file_path).stat().st_size if Path(file_path).exists() else 0
                checksum = self._calculate_file_checksum(file_path)
                
                sds_file = SDSFile(
                    chemical_id=chemical.id,
                    file_path=file_path,
                    file_name=f"{cas_number}-SDS.pdf",
                    file_size=file_size,
                    download_date=datetime.now(),
                    source=source,
                    checksum=checksum,
                    is_valid=True
                )
                
                self.db_session.add(sds_file)
                self.db_session.commit()
            
        except Exception as e:
            print(f"Error updating database for {cas_number}: {e}")
            self.db_session.rollback()
    
    def _calculate_file_checksum(self, file_path: str) -> str:
        """Calculate SHA-256 checksum of a file"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except:
            return ""
    
    def get_sds_info(self, cas_number: str) -> Optional[Dict[str, Any]]:
        """Get information about an SDS file"""
        if not self.db_session:
            return None
        
        try:
            chemical = self.db_session.query(Chemical).filter(
                Chemical.cas_number == cas_number
            ).first()
            
            if not chemical:
                return None
            
            sds_files = self.db_session.query(SDSFile).filter(
                SDSFile.chemical_id == chemical.id
            ).all()
            
            return {
                "cas_number": cas_number,
                "chemical_name": chemical.name,
                "sds_files": [
                    {
                        "id": sds.id,
                        "file_name": sds.file_name,
                        "file_size": sds.file_size,
                        "download_date": sds.download_date.isoformat() if sds.download_date else None,
                        "source": sds.source,
                        "version": sds.version,
                        "language": sds.language,
                        "is_valid": sds.is_valid
                    }
                    for sds in sds_files
                ]
            }
            
        except Exception as e:
            print(f"Error getting SDS info for {cas_number}: {e}")
            return None
    
    def validate_sds_file(self, file_path: str) -> Dict[str, Any]:
        """Validate an SDS file"""
        result = {
            "valid": False,
            "file_exists": False,
            "file_size": 0,
            "is_pdf": False,
            "errors": []
        }
        
        try:
            file_path_obj = Path(file_path)
            
            if not file_path_obj.exists():
                result["errors"].append("File does not exist")
                return result
            
            result["file_exists"] = True
            result["file_size"] = file_path_obj.stat().st_size
            
            # Check if it's a PDF
            try:
                with open(file_path, 'rb') as f:
                    header = f.read(4)
                    if header == b'%PDF':
                        result["is_pdf"] = True
                    else:
                        result["errors"].append("File is not a valid PDF")
            except Exception as e:
                result["errors"].append(f"Error reading file: {str(e)}")
            
            # Basic validation passed
            if result["file_exists"] and result["is_pdf"] and result["file_size"] > 0:
                result["valid"] = True
            
        except Exception as e:
            result["errors"].append(f"Validation error: {str(e)}")
        
        return result 

    def extract_and_store_ghs_from_pdf(self, cas_number: str, file_path: str) -> Dict[str, Any]:
        """Extract GHS info from a PDF and store in the database"""
        if not self.db_session:
            return {"success": False, "error": "No database session"}
        try:
            ghs_info = self.extract_ghs_from_pdf(file_path)
            if not ghs_info:
                return {"success": False, "error": "No GHS info found"}
            # Find chemical
            chemical = self.db_session.query(Chemical).filter(Chemical.cas_number == cas_number).first()
            if not chemical:
                return {"success": False, "error": "Chemical not found"}
            # Remove old GHS classifications for this chemical
            self.db_session.query(GHSClassification).filter(GHSClassification.chemical_id == chemical.id).delete()
            # Add new GHS classification
            ghs = GHSClassification(
                chemical_id=chemical.id,
                signal_word=ghs_info.get('signal_word'),
                hazard_statements=ghs_info.get('hazard_statements'),
                precautionary_statements=ghs_info.get('precautionary_statements'),
                pictograms=ghs_info.get('pictograms'),
                hazard_classes=ghs_info.get('hazard_classes'),
                classified_at=datetime.now(),
                classification_source='pdf_extraction'
            )
            self.db_session.add(ghs)
            self.db_session.commit()
            return {"success": True, "ghs": ghs_info}
        except Exception as e:
            self.db_session.rollback()
            return {"success": False, "error": str(e)}

    def extract_ghs_from_pdf(self, file_path: str) -> Dict[str, Any]:
        """Extract GHS info from a PDF using SDSParser with fallback to PyPDF2"""
        ghs_info = {
            'signal_word': None,
            'hazard_statements': [],
            'precautionary_statements': [],
            'pictograms': [],
            'hazard_classes': [],
            'source': 'sdsparser'  # Track which method was used
        }
        
        try:
            # First try with SDSParser
            from sdsparser import parse_sds
            import re
            
            try:
                # Parse the SDS file using SDSParser
                sds_data = parse_sds(file_path)
                
                # Extract signal word
                if hasattr(sds_data, 'hazard_statements') and sds_data.hazard_statements:
                    if any('Danger' in str(h) for h in sds_data.hazard_statements):
                        ghs_info['signal_word'] = 'Danger'
                    elif any('Warning' in str(h) for h in sds_data.hazard_statements):
                        ghs_info['signal_word'] = 'Warning'
                
                # Extract hazard statements (H-codes)
                if hasattr(sds_data, 'hazard_statements'):
                    h_statements = []
                    for stmt in sds_data.hazard_statements:
                        # Extract H-codes from the text
                        h_codes = re.findall(r'(H[2-4][0-9]{2}[^.]*\.?)', str(stmt))
                        h_statements.extend(h_codes)
                    ghs_info['hazard_statements'] = list(sorted(set(h_statements)))
                
                # Extract precautionary statements (P-codes)
                if hasattr(sds_data, 'precautionary_statements'):
                    p_statements = []
                    for stmt in sds_data.precautionary_statements:
                        # Extract P-codes from the text
                        p_codes = re.findall(r'(P[1-9][0-9]{2}[^.]*\.?)', str(stmt))
                        p_statements.extend(p_codes)
                    ghs_info['precautionary_statements'] = list(sorted(set(p_statements)))
                
                # Extract pictograms
                if hasattr(sds_data, 'pictograms'):
                    ghs_info['pictograms'] = [str(p) for p in sds_data.pictograms]
                
                # Extract hazard classes if available
                if hasattr(sds_data, 'hazard_classifications'):
                    ghs_info['hazard_classes'] = [str(hc) for hc in sds_data.hazard_classifications]
                
                # If we got good data from SDSParser, return it
                if ghs_info['hazard_statements'] or ghs_info['pictograms']:
                    return ghs_info
                    
            except Exception as sds_error:
                print(f"SDSParser error, falling back to PyPDF2: {sds_error}")
                ghs_info['source'] = 'pypdf2_fallback'
                ghs_info['parse_error'] = str(sds_error)
            
            # Fallback to PyPDF2 if SDSParser fails or returns no data
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = "\n".join(page.extract_text() or '' for page in reader.pages)
            
            # Normalize whitespace
            text = re.sub(r'\s+', ' ', text)
            
            # Signal word
            match = re.search(r'Signal word[:\s]+(Danger|Warning)', text, re.IGNORECASE)
            if match:
                ghs_info['signal_word'] = match.group(1).capitalize()
            
            # Hazard statements (H-codes) - H200-H499 range
            h_statements = re.findall(r'(H[2-4][0-9]{2}[^.]*\.?)', text)
            h_statements = [h.strip() for h in h_statements]
            ghs_info['hazard_statements'] = list(sorted(set(h_statements)))
            
            # Precautionary statements (P-codes)
            p_statements = re.findall(r'(P[1-9][0-9]{2}[^.]*\.?)', text)
            p_statements = [p.strip() for p in p_statements]
            ghs_info['precautionary_statements'] = list(sorted(set(p_statements)))
            
            # GHS pictograms (e.g., GHS02, GHS07, GHS08)
            pictograms = re.findall(r'(GHS[0-9]{2})', text)
            ghs_info['pictograms'] = list(sorted(set(pictograms)))
            
            # Hazard classes (e.g., Flam. Liq. 2, Carc. 1A, Eye Irrit. 2)
            hazard_classes = re.findall(r'([A-Z][a-zA-Z\. ]+\s[1-3][A-B]?)', text)
            # Deduplicate and clean
            hazard_classes = [hc.strip() for hc in hazard_classes if len(hc.strip()) > 3]
            ghs_info['hazard_classes'] = list(sorted(set(hazard_classes)))
            
            return ghs_info
            
        except Exception as e:
            return {"error": str(e), "source": "error"} 