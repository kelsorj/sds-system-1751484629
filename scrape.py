import requests
import os
from pathlib import Path
from typing import Tuple, Optional
import traceback
import sys
from bs4 import BeautifulSoup
from selenium import webdriver
import selenium
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

def extract_download_url_from_sigmaaldrich(cas_nr: str) -> Optional[Tuple[str, str]]:
    print(f'🔎 [Selenium] Trying Sigma-Aldrich for CAS {cas_nr}')
    driver = None
    try:
        print('Setting up Chrome options...')
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        # Add a more realistic user agent
        options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36")
        
        print('Installing ChromeDriver...')
        try:
            # Fix for the 'options' argument issue - newer versions of selenium handle this differently
            driver_path = None
            try:
                # Try to get the path without passing it directly to Chrome
                driver_path = ChromeDriverManager().install()
                print(f'ChromeDriver path: {driver_path}')
                driver = webdriver.Chrome(options=options)
            except Exception as cm_error:
                print(f'ChromeDriverManager error: {cm_error}')
                # Fall back to default Chrome installation
                driver = webdriver.Chrome(options=options)
        except Exception as driver_error:
            print(f'ChromeDriver initialization failed: {driver_error}')
            print('Selenium version:', selenium.__version__)
            return None
        
        # Try direct SDS document search approach
        print('Trying direct SDS document search approach')
        # First navigate to the documents search page
        documents_url = "https://www.sigmaaldrich.com/US/en/documents-search?tab=sds"
        print(f'Navigating to documents search: {documents_url}')
        driver.get(documents_url)
        driver.implicitly_wait(10)  # Increase wait time
        
        print('Page title:', driver.title)
        
        # Look for search input field
        print('Looking for search input field...')
        try:
            import time
            time.sleep(3)  # Wait for page to load
            
            # Save initial page source for debugging
            with open(f"sigma_search_page_{cas_nr}.html", "w", encoding="utf-8") as f:
                f.write(driver.page_source)
                print(f'Saved initial page source to sigma_search_page_{cas_nr}.html')
            
            # Try different approaches to find and use the search field
            search_selectors = [
                {'type': 'css', 'selector': 'input[type="search"]', 'name': 'Generic search input'},
                {'type': 'css', 'selector': 'input.MuiInputBase-input', 'name': 'MUI input'},
                {'type': 'xpath', 'selector': '//input[contains(@placeholder, "search") or contains(@placeholder, "Search")]', 'name': 'Search placeholder input'}
            ]
            
            search_input = None
            for selector in search_selectors:
                print(f"Trying to find search field with {selector['name']}")
                try:
                    if selector['type'] == 'css':
                        elements = driver.find_elements(By.CSS_SELECTOR, selector['selector'])
                    else:
                        elements = driver.find_elements(By.XPATH, selector['selector'])
                        
                    print(f"Found {len(elements)} potential search fields")
                    if elements:
                        search_input = elements[0]
                        break
                except Exception as e:
                    print(f"Error finding search field: {e}")
            
            if search_input:
                print("Found search input field, entering CAS number...")
                search_input.clear()
                search_input.send_keys(cas_nr)
                search_input.submit()  # Try submitting the form
                print("Search submitted")
                
                # Wait for results
                time.sleep(5)
                
                # Save results page source for debugging
                with open(f"sigma_results_page_{cas_nr}.html", "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
                    print(f'Saved results page to sigma_results_page_{cas_nr}.html')
                
                # Try to find SDS download links in results
                print("Looking for SDS download links in search results...")
                
                # Try multiple selector approaches to find SDS links
                download_selectors = [
                    {'type': 'css', 'selector': 'a[href*="/sds/"]', 'name': 'SDS link'},
                    {'type': 'xpath', 'selector': '//a[contains(@href, "sds") and contains(@href, "download")]', 'name': 'Download SDS link'},
                    {'type': 'xpath', 'selector': '//a[contains(text(), "Download") or contains(text(), "download")]', 'name': 'Download text link'},
                    {'type': 'css', 'selector': '.MuiButtonBase-root[href*=".pdf"]', 'name': 'PDF button link'}
                ]
                
                for selector in download_selectors:
                    print(f"Trying to find downloads with {selector['name']}")
                    try:
                        if selector['type'] == 'css':
                            links = driver.find_elements(By.CSS_SELECTOR, selector['selector'])
                        else:
                            links = driver.find_elements(By.XPATH, selector['selector'])
                            
                        print(f"Found {len(links)} potential download links")
                        
                        for link in links:
                            href = link.get_attribute("href")
                            text = link.text.strip()
                            print(f"Link: '{text}' - {href}")
                            
                            if href and ('.pdf' in href.lower() or 'sds' in href.lower()):
                                print(f"✅ Found SDS download link: {href}")
                                if driver:
                                    driver.quit()
                                return "SigmaAldrich", href
                    except Exception as e:
                        print(f"Error finding download links: {e}")
                
                # If no download links found but we did find results, try a direct PDF construction
                print("Attempting to construct direct PDF URL...")
                # For Sigma products, SDS URLs often follow a pattern
                pdf_url = f"https://www.sigmaaldrich.com/US/en/sds/sial/{cas_nr.replace('-', '')}"
                print(f"Constructed URL: {pdf_url}")
                if driver:
                    driver.quit()
                return "SigmaAldrich", pdf_url
            else:
                print("❌ Could not find search input field")
        except Exception as e:
            print(f"❌ Error during search process: {e}")
            traceback.print_exc()
        
        if driver:
            driver.quit()
    except Exception as e:
        print(f'❌ [Selenium] Error: {e}')
        traceback.print_exc()
        if driver:
            try:
                driver.quit()
            except:
                pass
    return None

def extract_download_url_from_chemblink(cas_nr: str) -> Optional[Tuple[str, str]]:
    print(f'Trying ChemBlink for CAS {cas_nr}')
    headers = {
        'user-agent': 'Mozilla/5.0',
        'referer': 'https://www.chemblink.com/'
    }
    try:
        url = f'https://www.chemblink.com/MSDS/{cas_nr}MSDS.htm'
        r = requests.get(url, headers=headers, timeout=20)
        print(f'ChemBlink search status: {r.status_code}')
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            a_tag = soup.find('a', string='View / download')
            if a_tag and a_tag.get('href'):
                pdf_url = 'https://www.chemblink.com' + a_tag['href']
                print(f'ChemBlink PDF found: {pdf_url}')
                return "ChemBlink", pdf_url
    except Exception as e:
        print(f'Error in ChemBlink extraction: {e}')
    return None

def extract_download_url_from_fisher(cas_nr: str) -> Optional[Tuple[str, str]]:
    print(f'Trying Fisher for CAS {cas_nr}')
    headers = {'user-agent': 'Mozilla/5.0'}
    try:
        url = f'https://www.fishersci.com/shop/products/search?sSearch={cas_nr}'
        r = requests.get(url, headers=headers, timeout=20)
        print(f'Fisher search response: {r.status_code}')
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            sds_link = soup.select_one('a[href*="/viewmsds.do"]')
            if sds_link:
                return "Fisher", 'https://www.fishersci.com' + sds_link['href']
    except Exception as e:
        print(f'Error in Fisher extraction: {e}')
    return None

# Define your endpoints as a list of extractor functions
SDS_ENDPOINTS = [
    extract_download_url_from_sigmaaldrich,
    extract_download_url_from_chemblink,
    extract_download_url_from_fisher,
]

# Updated download_sds function to iterate over endpoints with enhanced debugging
def download_sds(cas_nr: str, download_path: str) -> Tuple[str, bool, Optional[str]]:
    file_name = f"{cas_nr}-SDS.pdf"
    download_file = Path(download_path) / file_name
    download_path_obj = Path(download_path)

    print(f"\n=== SDS Download Process for CAS {cas_nr} ===\n")
    print(f"Download path: {download_path_obj.absolute()}")
    print(f"Target file: {download_file.absolute()}")
    
    # Check if download path exists and is writable
    if not download_path_obj.exists():
        print(f"WARNING: Download directory {download_path} doesn't exist! Creating it...")
        try:
            download_path_obj.mkdir(parents=True, exist_ok=True)
            print(f"Created directory: {download_path_obj.absolute()}")
        except Exception as e:
            print(f"ERROR: Failed to create directory: {e}")
            return cas_nr, False, None
    
    if not os.access(download_path_obj, os.W_OK):
        print(f"ERROR: No write permission to directory {download_path}")
        return cas_nr, False, None

    if download_file.exists():
        print(f'File {file_name} already exists at {download_file.absolute()}.')
        return cas_nr, True, None

    headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
    }

    print(f'\nSearching for {file_name} with CAS number {cas_nr}...')
    print(f'Using headers: {headers}')

    try:
        for endpoint_index, endpoint in enumerate(SDS_ENDPOINTS):
            print(f"\n[{endpoint_index + 1}/{len(SDS_ENDPOINTS)}] Trying source: {endpoint.__name__}")
            result = endpoint(cas_nr)
            if result:
                sds_source, full_url = result
                print(f'✓ Source found: {sds_source}')
                print(f'✓ URL identified: {full_url}')
                
                print(f'Attempting to download from {sds_source}...')
                try:
                    response = requests.get(full_url, headers=headers, timeout=30)
                    
                    print(f'HTTP Status: {response.status_code}')
                    print(f'Content-Type: {response.headers.get("content-type")}')
                    print(f'Content Length: {len(response.content)} bytes')
                    
                    # Additional validations
                    content_type = response.headers.get("content-type", "").lower()
                    if "pdf" not in content_type and len(response.content) < 5000:
                        print("WARNING: Response may not be a valid PDF (small size and no PDF content type)")
                        # Save the content for inspection
                        error_file = Path(download_path) / f"{cas_nr}_error_response.txt"
                        error_file.write_bytes(response.content)
                        print(f"Saved error response to {error_file}")
                    
                    if response.status_code == 200:
                        download_file.write_bytes(response.content)
                        file_size = download_file.stat().st_size
                        print(f'✓ Successfully downloaded {file_name} from {sds_source}')
                        print(f'✓ File size: {file_size} bytes')
                        if file_size < 10000:  # Check if file size seems reasonable for a PDF
                            print("WARNING: Downloaded file is suspiciously small for an SDS document")
                        return cas_nr, True, sds_source
                    else:
                        print(f'✗ Download failed with status code: {response.status_code}')
                except requests.exceptions.RequestException as req_error:
                    print(f'✗ Request error: {req_error}')
            else:
                print(f'✗ No result from {endpoint.__name__}')

        print(f'\n✗ All endpoints failed. Could not download {file_name}')
        return cas_nr, False, None

    except Exception as error:
        print(f"\n=== UNHANDLED ERROR ===\n")
        traceback.print_exception(type(error), error, error.__traceback__)
        print("\n=====================\n")
        return cas_nr, False, None

# Test execution block
if __name__ == '__main__':
    cas_test = '67-64-1'
    download_path = '.'
    download_sds(cas_test, download_path)
