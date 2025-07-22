# -*- coding: utf-8 -*-
"""
Created on Sunday, July 6, 2025
@author: Reed Kelso
"""

#%% Data mining from Sigma Aldrich website
# Search URL by CAS number:
# http://www.sigmaaldrich.com/catalog/search?interface=CAS%20No.&term=1314-62-1&N=0&lang=en&region=US&focus=product&mode=mode+matchall
# On product page, Safety Information table, with H-statements, P-statements and PPE type

#==============================================================================
# Libraries
#==============================================================================
import re
import os
import sys
import platform
import time
import pandas
import urllib
from bs4 import BeautifulSoup
from seleniumwire import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import requests
import csv

#==============================================================================
# Functions
#==============================================================================
def deblank(text):
    # Remove leading and trailing empty spaces
    return text.rstrip().lstrip()

def fixencoding(text):
    # Make string compatible with cp437 characters set (Windows console)
    return text.encode(encoding="cp437", errors="ignore").decode(encoding="utf-8", errors="ignore")

def deblankandcap(text):
    # Remove leading and trailing empty spaces, capitalize
    return text.rstrip().lstrip().capitalize()

def striphtml(text):
    # remove HTML tags from string (from: http://stackoverflow.com/a/3398894, John Howard)
    p = re.compile(r'<.*?>')
    return p.sub('', text)

def clean(text):
    # Deblank, fix encoding and strip HTML tags at once
    return striphtml(fixencoding(deblank(text)))

#==============================================================================
# Input
#==============================================================================
# Looking for info about chemical identified by CAS number from CSV file ...
CASlist = list()
reg_ids = dict()  # Dictionary to map CAS to REG_FORMATTED_ID

# Read from CSV file to get CAS #s
with open('dotmatics-export.csv', 'r') as csvfile:
    reader = csv.DictReader(csvfile)
    print(f"CSV columns: {reader.fieldnames}")
    first_row = next(reader)
    print(f"First row: {first_row}")
    # Use the actual fieldnames from the CSV
    cas_col = reader.fieldnames[2]
    reg_col = reader.fieldnames[0]
    # Reset reader to start after header
    csvfile.seek(0)
    reader = csv.DictReader(csvfile)
    for row in reader:
        cas_number = row.get(cas_col, '').strip()
        reg_id = row.get(reg_col, '').strip()
        print(f"Row: CAS='{cas_number}', REG_ID='{reg_id}'")
        if cas_number and cas_number != '-' and reg_id and cas_number != '':  # Skip empty or invalid entries
            CASlist.append(cas_number)
            reg_ids[cas_number] = reg_id
            print(f"Added: {cas_number} -> {reg_id}")
        else:
            print(f"Skipped: CAS='{cas_number}', REG_ID='{reg_id}'")

# Drop duplicates while preserving order
seen = set()
CASlist = [x for x in CASlist if not (x in seen or seen.add(x))]

# Clean up
if '' in CASlist:
    CASlist.remove('')

# Debug output
print(f"Loaded {len(CASlist)} CAS numbers from CSV")
print(f"First 5 CAS numbers: {CASlist[:5]}")
print(f"First 5 REG IDs: {[reg_ids.get(cas, 'N/A') for cas in CASlist[:5]]}")

# short list for testing
# CASlist=['4427-96-7']

#%%
#==============================================================================
# Search patterns
#==============================================================================
Ppattern = r'(P[0-9]{3}[0-9P\+]*)' # the letter P followed by 3 digits, including '+' combo
#Hpattern = 'H[0-9]{3}' # the letter H followed by 3 digits
Hpattern = r'(?i)(H[0-9]{3}[ifd0-9H\+]*)' # the letter H followed by 3 digits, including '+' combo, case insensitive fd
soloPpattern = r'(P[0-9]{3})' # individual P codes for parsing

# Parse H2P text file
# alternate syntax : with open('') as file:
textfile = open('H2P.txt', 'r')

# Initialize dictionary
H2P = dict()

for line in textfile:
    line = line.replace('\n','').replace('+ ','+') #.replace(',','')
    if re.match(Hpattern, line):
        hcode = re.match(Hpattern, line).group()
        H2P[hcode] = set(re.findall(Ppattern, line))

# Close textfile
textfile.close()

# Parse P-statements text file
textfile = open('P-statements.txt', 'r')

# Initialize dictionary
Pstatements = dict()

for line in textfile:
    line = line.replace('\n','').replace(' + ','+')
    if re.match(Ppattern, line):
        pcode = deblank(re.match(Ppattern, line).group())
        Pstatements[pcode] = deblank(line.split(pcode)[-1])

# Close textfile
textfile.close()

# Parse H-statements text file
textfile = open('H-statements.txt', 'r')

# Initialize dictionary
Hstatements = dict()

for line in textfile:
    line = line.replace('\n','').replace(' + ','+')
    if re.match(Hpattern, line):
        hcode = deblank(re.match(Hpattern, line).group())
        Hstatements[hcode] = deblank(line.split(hcode)[-1])

# Close textfile
textfile.close()

#==============================================================================
# Prevention, Response, Storage and Disposal P-statement from H-code
#==============================================================================
H2Prevention = dict()
H2Response = dict()
H2Storage = dict()
H2Disposal = dict()

for hcode in H2P:
    alist = H2Prevention.get(hcode,[])
    for pcode in H2P[hcode]:
        statement = Pstatements[pcode]
        if (pcode[1]=='2'): H2Prevention[hcode] = H2Prevention.get(hcode,[]); H2Prevention[hcode].append(statement)
        if (pcode[1]=='3'): H2Response[hcode]   = H2Response.get(hcode,[]); H2Response[hcode].append(statement)
        if (pcode[1]=='4'): H2Storage[hcode]    = H2Storage.get(hcode,[]); H2Storage[hcode].append(statement)
        if (pcode[1]=='5'): H2Disposal[hcode]   = H2Disposal.get(hcode,[]); H2Disposal[hcode].append(statement)

#%%
#==============================================================================
# Data mining Sigma Aldrich website
#==============================================================================

# Start Chrome instance
def get_chrome_options():
    """Return Chrome options based on the operating system"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-extensions")
    
    # Platform-specific configurations
    if sys.platform == 'darwin':  # macOS
        chrome_options.binary_location = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    elif 'linux' in sys.platform.lower():  # Linux/CentOS
        chrome_options.binary_location = '/usr/bin/google-chrome-stable'  # Default path for Google Chrome
        # Alternative path for Chromium if needed:
        # chrome_options.binary_location = '/usr/bin/chromium-browser'
    
    return chrome_options

# Debug print for platform and Python version
print(f"Platform: {sys.platform}, Python: {sys.version}")
print(f"Current working directory: {os.getcwd()}")

# Set up Chrome options
chrome_options = get_chrome_options()

# Use webdriver-manager to handle ChromeDriver
print("Setting up ChromeDriver with webdriver-manager...")
service = Service(ChromeDriverManager().install())

# Initialize the Chrome WebDriver
try:
    # Set download preferences
    if "SDS" not in os.listdir():
        os.mkdir("SDS")
    
    # Set download directory based on OS
    download_dir = os.path.join(os.getcwd(), "SDS")
    prefs = {
        "download.default_directory": download_dir,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "plugins.plugins_disabled": ["Chrome PDF Viewer"]
    }
    
    # Add preferences to Chrome options
    chrome_options.add_experimental_option("prefs", prefs)
    
    # Initialize the WebDriver
    driver = webdriver.Chrome(service=service, options=chrome_options)
    print("Chrome WebDriver initialized successfully")
    print(f"Download directory set to: {download_dir}")
    
except Exception as e:
    print(f"Error initializing Chrome WebDriver: {str(e)}")
    print("Please ensure Chrome and ChromeDriver are properly installed and in the system PATH")
    if 'linux' in sys.platform.lower():
        print("On CentOS, run 'bash setup_centos.sh' to install dependencies")
    elif sys.platform == 'darwin':
        print("On macOS, ensure Chrome and ChromeDriver are installed via Homebrew or manually")
    sys.exit(1)

# Initialize the list to store chemical data
chemicals = []
CASdict = dict()
badCAS = list()
failed_downloads = []  # List to track failed downloads
successful_downloads = []  # List to track successful downloads

# Track failed CAS numbers to avoid duplicates
failed_cas_set = set()

# Initialize failed downloads file
with open('failed_downloads.txt', 'w') as f:
    f.write(f"Failed Downloads Summary\n")
    f.write(f"Script started at: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write(f"Total CAS numbers to process: {len(CASlist)}\n\n")
    f.write("Failed downloads:\n")

for CAS in CASlist:

    chemical = dict()
    URL = dict()
    Name = ''

    # Store CAS #
    chemical['CAS'] = CAS
    print(CAS)

    try:
        # Webscraping search page
        searchURL = r'https://www.sigmaaldrich.com/US/en/search/[INSERT-HERE]?focus=products&page=1&perpage=30&sort=relevance&term=[INSERT-HERE]&type=cas_number'.replace('[INSERT-HERE]',CAS)
        print(f"  Searching URL: {searchURL}")
        driver.get(searchURL)
        time.sleep(2)  # Give JS time to load
        soup = BeautifulSoup(driver.page_source, "html.parser")
        print(f"  Parsed HTML with BeautifulSoup")

        # Accept cookies if the banner appears
        try:
            accept_btn = WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(translate(., 'ACEPTLL', 'aceptll'), 'accept') or contains(., 'Accept all') or contains(., 'Accept All') or contains(., 'ACCEPT ALL') or contains(., 'accept all') or contains(., 'Enable') or contains(., 'Accept')]"))
            )
            accept_btn.click()
            print("  Accepted cookies.")
            time.sleep(1)
        except Exception:
            pass  # No cookie banner found, continue

        # Find all product rows in the table
        product_rows = driver.find_elements(By.XPATH, "//tr[td/a[contains(@href, '/US/en/product/')]]")
        print(f"  Found {len(product_rows)} product rows.")
        sds_downloaded_for_cas = False
        for row in product_rows:
            if sds_downloaded_for_cas:
                break  # Only one SDS per CAS
            try:
                # Get product number and URL
                product_link = row.find_element(By.XPATH, ".//a[contains(@href, '/US/en/product/')]")
                product_number = product_link.text.strip()
                product_url = product_link.get_attribute('href')
                print(f"    Product number: {product_number}, URL: {product_url}")

                # Find the SDS button in this row - trying multiple selectors for robustness
                sds_button = None
                sds_selectors = [
                    ".//button[contains(@data-testid, 'sds-')]",  # Original selector
                    ".//button[contains(., 'SDS')]",  # Button with 'SDS' text
                    ".//a[contains(., 'SDS')]",  # Link with 'SDS' text
                    ".//*[contains(@class, 'sds') and (self::button or self::a)]",  # Class containing 'sds'
                    ".//*[contains(translate(., 'SDS', 'sds'), 'sds') and (self::button or self::a)]"  # Case-insensitive SDS text
                ]
                
                for selector in sds_selectors:
                    try:
                        sds_button = row.find_element(By.XPATH, selector)
                        print(f"      Found SDS button with selector: {selector}")
                        break
                    except:
                        continue
                        
                if not sds_button:
                    print("      Could not find SDS button with any selector")
                    continue
                    
                print(f"      Clicking SDS button for product {product_number}...")
                driver.execute_script("arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'});", sds_button)
                time.sleep(1)  # Give it time to scroll
                
                # Try multiple click methods if needed
                click_success = False
                for click_method in [
                    lambda: sds_button.click(),  # Standard click
                    lambda: driver.execute_script("arguments[0].click();", sds_button),  # JS click
                    lambda: driver.execute_script("arguments[0].dispatchEvent(new MouseEvent('click', {bubbles: true}));", sds_button)  # Simulated event
                ]:
                    try:
                        click_method()
                        click_success = True
                        print("      Click successful")
                        time.sleep(2)  # Wait for any modal to appear
                        break
                    except Exception as e:
                        print(f"      Click attempt failed: {str(e)[:100]}...")
                        
                if not click_success:
                    print("      All click methods failed")
                    continue

                # Wait for the English SDS link in the modal
                english_link = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'English - EN')]"))
                )
                english_href = english_link.get_attribute('href')
                print(f"        English SDS link: {english_href}")
                
                # Clear previous requests before clicking
                del driver.requests
                
                # Open the PDF in a new tab
                driver.execute_script("window.open(arguments[0]);", english_href)
                time.sleep(2)
                # Switch to the new tab
                driver.switch_to.window(driver.window_handles[-1])
                # Accept cookies in the PDF viewer tab if needed
                try:
                    accept_btn = WebDriverWait(driver, 3).until(
                        EC.element_to_be_clickable((By.XPATH, "//button[contains(translate(., 'ACEPTLL', 'aceptll'), 'accept') or contains(., 'Accept all') or contains(., 'Accept All') or contains(., 'ACCEPT ALL') or contains(., 'accept all') or contains(., 'Accept')]"))
                    )
                    accept_btn.click()
                    print("        Accepted cookies in PDF viewer tab.")
                    time.sleep(1)
                except Exception:
                    pass
                
                # Find the direct PDF download link
                sds_dir = "/react-apps/sds-millbrae/sds-company-system/sds-react-frontend/sigma/SDS"
                if not os.path.exists(sds_dir):
                    os.makedirs(sds_dir)
                reg_id = reg_ids.get(CAS, CAS)  # Use REG_FORMATTED_ID if available, otherwise use CAS
                pdf_filename = os.path.join(sds_dir, f"{reg_id}_{CAS}.pdf")
                pdf_downloaded = False
                
                # Capture PDF URL from network traffic in real-time
                try:
                    pdf_url = None
                    print(f"        Checking for PDF network requests...")
                    # Wait a bit for requests to come in
                    time.sleep(5)
                    
                    # Debug: Print all captured requests
                    print(f"        Total requests captured: {len(driver.requests)}")
                    for i, request in enumerate(driver.requests):
                        print(f"        Request {i+1}: {request.method} {request.path}")
                        if request.response:
                            print(f"          Status: {request.response.status_code}")
                            print(f"          Content-Type: {request.response.headers.get('content-type', 'unknown')}")
                    
                    for request in driver.requests:
                        if request.response and (
                            'application/pdf' in request.response.headers.get('content-type', '').lower()
                        ) and request.response.status_code == 200:
                            pdf_url = request.url
                            print(f"        Captured PDF URL from network: {pdf_url}")
                            break
                    if pdf_url:
                        # Get the PDF content directly from the captured network response
                        try:
                            pdf_content = None
                            for request in driver.requests:
                                if request.url == pdf_url and request.response and request.response.body:
                                    pdf_content = request.response.body
                                    print(f"        Found PDF content in network response ({len(pdf_content)} bytes)")
                                    break
                            
                            if pdf_content and len(pdf_content) > 1000:  # PDF should be larger than 1KB
                                with open(pdf_filename, "wb") as f:
                                    f.write(pdf_content)
                                print(f"        Downloaded PDF to {pdf_filename} from network capture")
                                pdf_downloaded = True
                            else:
                                print(f"        PDF content appears to be empty or invalid")
                        except Exception as e:
                            print(f"        Could not download PDF using network response: {e}")
                    else:
                        print(f"        No PDF URL found in network requests.")
                except Exception as e:
                    print(f"        Could not capture PDF from network: {e}")
                if not pdf_downloaded:
                    print(f"        All attempts to download PDF failed for {CAS} {product_number}.")
                    failed_downloads.append(f"{CAS} {product_number}")
                    # Write failed CAS to file immediately, only once
                    if CAS not in failed_cas_set:
                        with open('failed_downloads.txt', 'a') as f:
                            f.write(f"{CAS}\n")
                        failed_cas_set.add(CAS)
                # Close the PDF tab
                driver.close()
                # Switch back to the main tab
                driver.switch_to.window(driver.window_handles[0])
                # Close the modal (find the close button and click)
                try:
                    close_button = driver.find_element(By.XPATH, "//button[@aria-label='Close']")
                    close_button.click()
                    time.sleep(1)
                except Exception as e:
                    print(f"        Could not close modal: {e}")
                if pdf_downloaded:
                    sds_downloaded_for_cas = True
                    successful_downloads.append(CAS)
            except Exception as e:
                print(f"      Could not process product row: {e}")
                # Write failed CAS to file immediately, only once
                if CAS not in failed_cas_set:
                    with open('failed_downloads.txt', 'a') as f:
                        f.write(f"{CAS}\n")
                    failed_cas_set.add(CAS)

        continue  # Move to the next CAS number after processing all product rows

    except Exception as e:
        badCAS.append(CAS)
        failed_downloads.append(f"{CAS} - Processing failed: {str(e)}")
        # Write failed CAS to file immediately, only once
        if CAS not in failed_cas_set:
            with open('failed_downloads.txt', 'a') as f:
                f.write(f"{CAS}\n")
            failed_cas_set.add(CAS)
        print(f'Could not process %s - %s: %s' % (CAS, Name, str(e)))
        print(f'  Exception type: {type(e).__name__}')
        import traceback
        print(f'  Traceback: {traceback.format_exc()}')

# Close Chrome instance
driver.quit()

# Append final summary to failed downloads file
with open('failed_downloads.txt', 'a') as f:
    f.write(f"\n\nScript completed at: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write(f"Total CAS numbers processed: {len(CASlist)}\n")
    f.write(f"Failed downloads: {len(failed_downloads)}\n")
    f.write(f"Successful downloads: {len(successful_downloads)}\n")
    f.write(f"Success rate: {((len(CASlist) - len(failed_downloads)) / len(CASlist) * 100):.1f}%\n")

# Remove successfully downloaded CAS numbers from CSV file
if successful_downloads:
    print(f"\nRemoving {len(successful_downloads)} successfully downloaded CAS numbers from CSV...")
    
    # Read the original CSV
    with open('dotmatics-export.csv', 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        fieldnames = reader.fieldnames
        
        # Create a new CSV without successful downloads
        with open('dotmatics-export-remaining.csv', 'w', newline='') as new_csvfile:
            writer = csv.DictWriter(new_csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            # Reset reader to start from beginning
            csvfile.seek(0)
            next(csvfile)  # Skip header row
            
            reader = csv.DictReader(csvfile)
            for row in reader:
                cas_number = row.get(cas_col, '').strip()
                # Only write rows for CAS numbers that weren't successfully downloaded
                if cas_number not in successful_downloads:
                    # Filter the row to only include fields that exist in fieldnames
                    filtered_row = {k: v for k, v in row.items() if k in fieldnames}
                    writer.writerow(filtered_row)
    
    print(f"Updated CSV saved as 'dotmatics-export-remaining.csv'")
    print(f"Remaining CAS numbers: {len(CASlist) - len(successful_downloads)}")
else:
    print(f"\nNo successful downloads to remove from CSV.")

# Display
print('Processed %d chemicals out of %d CAS numbers received' % (len(chemicals),len(CASlist)))

if len(badCAS) > 0:
    print('Unable to process the following CAS numbers:')
    for cas in badCAS: print(cas)

# Only proceed with post-processing if we have chemicals to process
if chemicals:
    #%% Post processing
    #==============================================================================
    # Compilation of Statements
    #==============================================================================
    # Inventory of H-, P- and PPE statements
    Hlist = list()
    HfromCAS = dict()
    HfromChemical = dict()

    Plist = list()
    PfromCAS = dict()
    PfromChemical = dict()

    PPElist=list()
    PPEfromCAS = dict()
    PPEfromChemical = dict()

    Hsupplist = list()
    HsuppfromCAS = dict()
    HsuppfromChemical = dict()

    for chemical in chemicals:
        if 'Hazards' in chemical.keys():
            for hazard in chemical['Hazards']:
                Hlist.append(hazard)
                alist = HfromCAS.get(hazard,[])
                alist.append(chemical['CAS'])
                alist = [item for item in set(alist)]
                alist.sort()
                HfromCAS[hazard] = alist

                alist = HfromChemical.get(hazard,[])
                alist.append(chemical['Name'])
                alist = [item for item in set(alist)]
                alist.sort()
                HfromChemical[hazard] = alist

        if 'Precautions' in chemical.keys():
            for precaution in chemical['Precautions']:
                Plist.append(precaution)
                alist = PfromCAS.get(precaution,[])
                alist.append(chemical['CAS'])
                alist = [item for item in set(alist)]
                alist.sort()
                PfromCAS[precaution] = alist

                alist = PfromChemical.get(precaution,[])
                alist.append(chemical['Name'])
                alist = [item for item in set(alist)]
                alist.sort()
                PfromChemical[precaution] = alist

        if 'PPE' in chemical.keys():
            for ppe in chemical['PPE']:
                PPElist.append(ppe)
                alist = PPEfromCAS.get(ppe,[])
                alist.append(chemical['CAS'])
                alist = [item for item in set(alist)]
                alist.sort()
                PPEfromCAS[ppe] = alist

                alist = PPEfromChemical.get(ppe,[])
                alist.append(chemical['Name'])
                alist = [item for item in set(alist)]
                alist.sort()
                PPEfromChemical[ppe] = alist

        if 'Supp. Hazards' in chemical.keys():
            for hazard in chemical['Supp. Hazards']:
                Hsupplist.append(hazard)
                alist = HsuppfromCAS.get(hazard,[])
                alist.append(chemical['CAS'])
                alist = [item for item in set(alist)]
                alist.sort()
                HsuppfromCAS[hazard] = alist

                alist = HsuppfromChemical.get(hazard,[])
                alist.append(chemical['Name'])
                alist = [item for item in set(alist)]
                alist.sort()
                HsuppfromChemical[hazard] = alist

    # Count instances of each H-statement
    Hdict = dict()
    for Hstatement in Hlist:
        key = Hstatement
        Hdict[key] = Hdict.get(key, 0) + 1

    # Count instances of each P-statement
    Pdict = dict()
    for Pstatement in Plist:
        key = Pstatement
        Pdict[key] = Pdict.get(key, 0) + 1

    # Count instances of each PPE recommendation
    PPEdict = dict()
    for ppe in PPElist:
        key=ppe
        PPEdict[key] = PPEdict.get(key, 0) + 1

    # Count instances of each supplemental Hazard statement
    Hsuppdict = dict()
    for statement in Hsupplist:
        key = statement
        Hsuppdict[key] = Hsuppdict.get(key, 0) + 1

    # Create a dataframe with a list of unique H-statements
    H = pandas.DataFrame(Hlist, columns = ['Code'])
    Hunique = H[H.Code!=''].drop_duplicates()

    Hunique['Count']            = Hunique['Code'].map(Hdict)
    Hunique['Statement']        = Hunique['Code'].map(Hstatements)
    Hunique['Assoc.Pcode']      = Hunique['Code'].str.slice(0,4).map(H2P)
    Hunique['Assoc.CAS']        = Hunique['Code'].map(HfromCAS)
    Hunique['Assoc.Chemical']   = Hunique['Code'].map(HfromChemical)
    Hunique['Prevention']       = Hunique['Code'].str.slice(0,4).map(H2Prevention)
    Hunique['Response']         = Hunique['Code'].str.slice(0,4).map(H2Response)
    Hunique['Storage']          = Hunique['Code'].str.slice(0,4).map(H2Storage)
    Hunique['Disposal']         = Hunique['Code'].str.slice(0,4).map(H2Disposal)

    # Create a dataframe with a list of unique P-statements
    P = pandas.DataFrame(Plist, columns = ['Code'])
    Punique = P[P.Code!=''].drop_duplicates()

    codes = Punique['Code']
    statements = [' '.join([Pstatements[solo] for solo in re.findall(soloPpattern,code)]) for code in Punique['Code']]
    Precautions = dict(zip(codes, statements))

    Punique['Count']            = Punique['Code'].map(Pdict)
    Punique['Statement']        = Punique['Code'].map(Precautions)
    Punique['Assoc.CAS']        = Punique['Code'].map(PfromCAS)
    Punique['Assoc.Chemical']   = Punique['Code'].map(PfromChemical)

    # Create a dataframe with a list of unique PPE requirements
    PPE = pandas.DataFrame(PPElist, columns = ['Item'])
    PPEunique = PPE[PPE.Item!=''].drop_duplicates()

    PPEunique['Count']            = PPEunique['Item'].map(PPEdict)
    PPEunique['Assoc.CAS']        = PPEunique['Item'].map(PPEfromCAS)
    PPEunique['Assoc.Chemical']   = PPEunique['Item'].map(PPEfromChemical)

    # Create a dataframe with a list of unique supplemental hazards
    Hsupp = pandas.DataFrame(Hsupplist, columns = ['Statement'])
    Hsuppunique = Hsupp[Hsupp.Statement!=''].drop_duplicates()

    codes = list()
    statements = Hsuppunique['Statement']
    for idx, statement in enumerate(statements):
        codes.append('Supp. %d' % (idx+1))
    Hsuppcodes = dict(zip(statements, codes))

    Hsuppunique['Code']            = Hsuppunique['Statement'].map(Hsuppcodes)
    Hsuppunique['Count']            = Hsuppunique['Statement'].map(Hsuppdict)
    Hsuppunique['Assoc.CAS']        = Hsuppunique['Statement'].map(HsuppfromCAS)
    Hsuppunique['Assoc.Chemical']   = Hsuppunique['Statement'].map(HsuppfromChemical)

    # Concatenate GHS Hazards and supplemental Hazards
    Hcombo = pandas.concat([Hunique, Hsuppunique])

    #==============================================================================
    # Table of all chemicals
    #==============================================================================
    chemicalsDF = pandas.DataFrame(chemicals)
    chemicalsDF['Product Number'] = chemicalsDF.apply(lambda row: '<a href="' + row['ProductURL'] + '">' + row['ProductNumber'] + '</a>',axis=1)
    chemicalsDF['SDS'] = chemicalsDF.apply(lambda row: '<a href="' + row['SDSfile'] + '">SDS</a>',axis=1)


    #%% Export
    # HTML table settings
    pandas.set_option('display.max_colwidth', None)

    # List of chemicals, sorted by name, with CAS, URL, SDS,...
    inventory = open("Inventory.html",'w')
    inventory.write(chemicalsDF.sort_values('Name').to_html(index=False, na_rep='-', escape=False, columns=['Name', 'Synonyms', 'CAS', 'Formula', 'Hazards', 'Precautions', 'PPE', 'Product Number', 'SDS']))
    inventory.close()

    # Export Hazards and supplemental Hazards to HTML file
    Hlist = open('Hazards.html','w')
    Hlist.write(Hcombo.sort_values('Code').to_html(index=False, na_rep='-', columns=['Code', 'Count', 'Statement', 'Assoc.Chemical', 'Prevention', 'Response', 'Storage', 'Disposal']))
    Hlist.close()

    # Export Precautions to HTML file
    Plist = open('Precautions.html','w')
    Plist.write(Punique.sort_values('Code').to_html(index=False, na_rep='-', columns=['Code', 'Count', 'Statement', 'Assoc.Chemical']))
    Plist.close()

    # Export PPE to HTML file
    PPElist = open('PPE.html','w')
    PPElist.write(PPEunique.sort_values('Item').to_html(index=False, na_rep='-', columns=['Item', 'Count', 'Assoc.Chemical']))
    PPElist.close()

    ## Export supplemental Hazards to HTML file
    #Slist = open('Slist.html','w')
    #Slist.write(Hsuppunique.sort_values('Code').to_html(index=False, columns=['Code', 'Count', 'Statement', 'Assoc.Chemical'], na_rep='-'))
    #Slist.close()

    # Export to Excel file (via xlsxwriter)
    writer = pandas.ExcelWriter('Hazard Assessment.xlsx', engine='xlsxwriter')
    chemicalsDF.sort_values('Name').to_excel(writer,'Inventory', index=False, na_rep='-')
    Hcombo.sort_values('Code').to_excel(writer,'Hazards', index=False, na_rep='-')
    Punique.sort_values('Code').to_excel(writer,'Precautions', index=False, na_rep='-')
    PPEunique.sort_values('Item').to_excel(writer,'PPE', index=False, na_rep='-')
    writer.close()

# Final summary (always run, regardless of whether chemicals were processed)
print(f"\nDownload Summary:")
print(f"Total CAS numbers: {len(CASlist)}")
print(f"Successful downloads: {len(successful_downloads)}")
print(f"Failed downloads: {len(failed_downloads)}")
print(f"Success rate: {((len(CASlist) - len(failed_downloads)) / len(CASlist) * 100):.1f}%")
print(f"Failed downloads saved to: failed_downloads.txt")