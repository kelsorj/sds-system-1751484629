#!/usr/bin/env python3

import os
import time
import random
import logging
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
import requests
import json
import string

# Import Selenium packages
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver.common.action_chains import ActionChains
import selenium.webdriver.common.keys as Keys
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager

# Set up logging
log_file = f"sigma_crawler_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("SigmaCrawler")

# Global constants
OUTPUT_DIR = "sigma_sds_pdfs"
SUCCESS_FILE = "successful_downloads.txt"
FAILED_FILE = "failed_downloads.txt"
PAGE_SOURCE_DIR = "page_sources"

# User agents to rotate
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:96.0) Gecko/20100101 Firefox/96.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36"
]

# Track downloads
successful_downloads = []
failed_downloads = []

# Create necessary directories
Path(OUTPUT_DIR).mkdir(exist_ok=True)
Path(PAGE_SOURCE_DIR).mkdir(exist_ok=True)

def setup_stealth_driver():
    """Set up and return a Selenium WebDriver instance with enhanced anti-detection measures"""
    try:
        # Get a random user agent
        user_agent = random.choice(USER_AGENTS)
        logger.info(f"Using user agent: {user_agent}")
        
        # Try to use Firefox first (since it's available on the system)
        try:
            logger.info("Attempting to use Firefox WebDriver")
            # Configure Firefox options
            options = FirefoxOptions()
            
            # Set user agent
            options.set_preference("general.useragent.override", user_agent)
            
            # Disable WebRTC to prevent leaks
            options.set_preference("media.peerconnection.enabled", False)
            options.set_preference("media.navigator.enabled", False)
            
            # Disable various features that can be used for fingerprinting
            options.set_preference("privacy.resistFingerprinting", True)
            options.set_preference("privacy.trackingprotection.enabled", True)
            
            # Disable notifications and password saving
            options.set_preference("dom.webnotifications.enabled", False)
            options.set_preference("signon.rememberSignons", False)
            
            # Optional: Use headless mode if needed
            # options.add_argument("-headless")
            
            # Set window size
            options.add_argument("--width=1920")
            options.add_argument("--height=1080")
            
            # Get GeckoDriver path and create service
            driver_path = GeckoDriverManager().install()
            service = FirefoxService(executable_path=driver_path)
            
            # Create Firefox driver
            driver = webdriver.Firefox(service=service, options=options)
            
            logger.info("Firefox WebDriver initialized successfully")
            
        except Exception as firefox_error:
            logger.warning(f"Failed to initialize Firefox: {firefox_error}")
            logger.info("Falling back to Chrome WebDriver")
            
            # Configure Chrome options for maximum stealth
            options = ChromeOptions()
            
            options.add_argument(f'--user-agent={user_agent}')
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_argument('--disable-extensions')
            options.add_argument('--disable-gpu')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--no-sandbox')
            options.add_argument('--ignore-certificate-errors')
            options.add_argument('--ignore-ssl-errors')
            options.add_argument('--disable-infobars')
            options.add_argument('--window-size=1920,1080')
            options.add_argument('--start-maximized')
            options.add_argument('--headless=new')  # Use headless mode for Chrome as fallback
            
            # Add experimental flags
            options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
            options.add_experimental_option("useAutomationExtension", False)
            
            # Additional preferences to help evade detection
            prefs = {
                "profile.default_content_setting_values.notifications": 2,
                "credentials_enable_service": False,
                "profile.password_manager_enabled": False,
                "webrtc.ip_handling_policy": "disable_non_proxied_udp",
                "webrtc.multiple_routes_enabled": False,
                "webrtc.nonproxied_udp_enabled": False
            }
            options.add_experimental_option("prefs", prefs)
            
            # Create Chrome browser
            driver_path = ChromeDriverManager().install()
            service = ChromeService(driver_path)
            driver = webdriver.Chrome(service=service, options=options)
        
        # Set page load timeout - increase to handle slow loading
        driver.set_page_load_timeout(60)
        
        # Add extensive anti-detection measures by modifying JavaScript properties
        anti_detection_js = """
        // Hide WebDriver
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        
        // Spoof plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                return [{
                    0: {type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format'},
                    name: 'PDF Viewer',
                    description: 'Portable Document Format',
                    filename: 'internal-pdf-viewer'
                }];
            }
        });
        
        // Spoof languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en', 'es']
        });
        
        // Spoof platform
        Object.defineProperty(navigator, 'platform', {
            get: () => 'Win32'
        });
        
        // Chrome runtime
        window.navigator.chrome = {
            runtime: {}
        };
        
        // Fake permissions behavior
        const originalQuery = window.navigator.permissions?.query;
        if (originalQuery) {
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                Promise.resolve({state: Notification.permission}) :
                originalQuery(parameters)
            );
        }
        
        // Spoof product sub
        Object.defineProperty(navigator, 'productSub', {
            get: () => '20030107'
        });
        """
        driver.execute_script(anti_detection_js)
        
        # Generate and set a random session ID
        session_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=32))
        driver.execute_script(f"sessionStorage.setItem('session_id', '{session_id}')")
        
        logger.info("Successfully created enhanced stealth Chrome instance")
        return driver
    except Exception as e:
        logger.error(f'Error initializing stealth Chrome: {e}')
        return None

def simulate_human_behavior(driver):
    """Simulate human-like mouse movements and page interactions"""
    try:
        # Random scroll behavior
        scroll_amount = random.randint(100, 400)
        driver.execute_script(f"window.scrollBy(0, {scroll_amount});")
        time.sleep(random.uniform(0.5, 2))
        
        # Maybe scroll back up a bit
        if random.choice([True, False]):
            driver.execute_script(f"window.scrollBy(0, {-random.randint(50, 200)});")
            time.sleep(random.uniform(0.3, 1))
        
        # Random mouse movements (simulated through JavaScript)
        for _ in range(random.randint(2, 5)):
            x = random.randint(100, 700)
            y = random.randint(100, 500)
            driver.execute_script(f"document.elementFromPoint({x}, {y});")
            time.sleep(random.uniform(0.1, 0.4))
        
        logger.debug("Simulated human behavior")
    except Exception as e:
        logger.debug(f"Error in simulate_human_behavior: {e}")

def download_sds_with_selenium(product_id, code):
    """Download SDS PDF for a specific product ID and product code using Selenium"""
    
    output_file = os.path.join(OUTPUT_DIR, f"{product_id}_{code}_SDS.pdf")
    page_source_file = os.path.join(PAGE_SOURCE_DIR, f"{product_id}_{code}_page.html")
    
    # Skip if file already exists
    if os.path.exists(output_file):
        logger.info(f"Skipping {output_file} - already exists")
        return True
    
    # Initialize stealth Chrome driver
    driver = setup_stealth_driver()
    if not driver:
        logger.error("Failed to initialize stealth Chrome driver")
        return False
        
    # Use a randomized delay before navigating to simulate human behavior
    time.sleep(random.uniform(1, 3))
            
    # First visit the homepage to establish cookies and session
    try:
        logger.info("First visiting homepage to establish session...")
        homepage_url = "https://www.sigmaaldrich.com/"
        driver.get(homepage_url)
        time.sleep(random.uniform(2, 4))
    except Exception as e:
        logger.error(f"Error accessing homepage: {e}")
        # Try one more time with a longer wait
        try:
            logger.info("Retrying homepage access...")
            time.sleep(random.uniform(3, 5))
            driver.get(homepage_url)
            time.sleep(random.uniform(2, 4))
        except Exception as e:
            logger.error(f"Error accessing homepage on retry: {e}")
            if driver:
                driver.quit()
            return False
        
        # Simulate some human behavior
        simulate_human_behavior(driver)
            
        # Now navigate to the SDS page with more product code variations
        # Try multiple URL formats that Sigma-Aldrich might use
        possible_urls = [
            f"https://www.sigmaaldrich.com/US/en/sds/{code.lower()}/{product_id}?userType=anonymous",
            f"https://www.sigmaaldrich.com/US/en/sds/{code.lower()}/{product_id}",
            f"https://www.sigmaaldrich.com/US/en/product/{code.lower()}/{product_id}",  # Try product page which may have SDS link
        ]
        
        success = False
        for url in possible_urls:
            if success:
                break
                
            logger.info(f"Trying URL: {url}")
            
            # Navigate with random delay and retry mechanism
            max_retries = 2
            retry_count = 0
            
            while retry_count <= max_retries and not success:
                try:
                    # Random delay before navigation
                    time.sleep(random.uniform(1, 3))
                    
                    # Clear cookies before new attempt
                    if retry_count > 0:
                        driver.delete_all_cookies()
                        time.sleep(1)
                        
                    # Navigate to URL
                    driver.get(url)
                    
                    # Simulate scroll before waiting for elements
                    try:
                        driver.execute_script("window.scrollTo(0, document.body.scrollHeight / 2);")
                        time.sleep(random.uniform(1, 2))
                    except Exception as scroll_error:
                        logger.debug(f"Error during scrolling: {scroll_error}")
                    
                    # Give the page time to load with increased timeout
                    wait = WebDriverWait(driver, 30)
                    try:
                        # Wait for body to ensure page has loaded
                        wait.until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
                    except TimeoutException:
                        logger.warning(f"Timeout waiting for page body to load at {url}")
                        retry_count += 1
                        continue
                        
                    # See if we have a product not found message
                    if any(phrase in driver.page_source for phrase in ["Product not found", "No results found", "could not be found", "no longer available"]):
                        logger.info(f"Product {product_id} with code {code} not found at {url}")
                        retry_count += 1
                        continue
                        
                    # Check if we're being blocked or getting a captcha
                    if any(phrase in driver.page_source.lower() for phrase in ["captcha", "robot", "automated", "detection", "blocked", "verify you are a human"]):
                        logger.warning(f"Possible bot detection at {url} - saving page source")
                        with open(page_source_file, "w", encoding="utf-8") as f:
                            f.write(driver.page_source)
                        
                        # Try a different URL or retry after a longer delay
                        retry_count += 1
                        time.sleep(random.uniform(5, 10))
                        continue
                    
                    # Save the page source for debugging
                    with open(page_source_file, "w", encoding="utf-8") as f:
                        f.write(driver.page_source)
                    
                    logger.info(f"Page loaded successfully for {product_id} with code {code}")
                    
                    # Look for download links using various strategies
                    download_candidates = []
                    
                    # Strategy 1: Direct PDF links
                    download_candidates.extend(driver.find_elements(By.XPATH, "//a[contains(@href, '.pdf')]"))
                    
                    # Strategy 2: Button with download text
                    download_candidates.extend(driver.find_elements(By.XPATH, "//a[contains(text(), 'Download') or contains(text(), 'download')]"))
                    
                    # Strategy 3: Look for download buttons with specific classes
                    download_candidates.extend(driver.find_elements(By.CSS_SELECTOR, ".download-button, .btn-download, [data-action='download']"))
                    
                    if download_candidates:
                        # Choose the first viable candidate
                        download_link = None
                        for candidate in download_candidates:
                            href = candidate.get_attribute("href")
                            if href and ('.pdf' in href.lower() or '/sds/' in href.lower()):
                                download_link = candidate
                                break
                            
                        if download_link:
                            download_url = download_link.get_attribute("href")
                            logger.info(f"Found download URL: {download_url}")
                            
                            # Simulate a human clicking the download link
                            logger.info("Simulating a click on the download link")
                            try:
                                # Scroll to the element with a bit of randomness
                                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", download_link)
                                time.sleep(random.uniform(0.5, 1.5))
                                # Click the link directly to download the file
                                download_link.click()
                                time.sleep(random.uniform(3, 6))  # Wait for download to start
                                
                                # Fallback to programmatic download if click doesn't initiate download
                                logger.info(f"Downloading PDF from {download_url}")
                                
                                # Use requests with cookies from selenium session
                                cookies = driver.get_cookies()
                                s = requests.Session()
                                for cookie in cookies:
                                    s.cookies.set(cookie['name'], cookie['value'])
                                
                                headers = {
                                    'User-Agent': driver.execute_script("return navigator.userAgent;"),
                                    'Referer': url,
                                    'Accept': 'application/pdf,*/*',
                                    'Accept-Language': 'en-US,en;q=0.9',
                                    'Connection': 'keep-alive'
                                }
                                
                                response = s.get(download_url, headers=headers, timeout=30)
                                
                                if response.status_code == 200 and ('pdf' in response.headers.get('Content-Type', '').lower() or 
                                                              len(response.content) > 1000):  # Basic check that it's likely a PDF
                                    # Save the PDF
                                    with open(output_file, 'wb') as f:
                                        f.write(response.content)
                                    
                                    file_size = len(response.content)
                                    logger.info(f"✅ Success! Downloaded {output_file} - Size: {file_size} bytes")
                                    
                                    # Record the successful download
                                    successful_downloads.append(f"{product_id},{code},{url},{datetime.now()}")
                                    driver.quit()
                                    return True
                                else:
                                    logger.error(f"Failed to download PDF: Status={response.status_code}, Content-Type={response.headers.get('Content-Type')}")
                            except requests.exceptions.RequestException as e:
                                logger.error(f"Error downloading PDF: {e}")
                            except Exception as e:
                                logger.error(f"Error clicking or downloading: {e}")
                            else:
                                logger.info("Found download candidates, but none with valid PDF links")
                        else:
                            logger.info("No download candidates found")
                
                except TimeoutException:
                    logger.info(f"Timeout waiting for SDS page to load for {product_id} with code {code}")
                except Exception as e:
                    logger.error(f"Error processing SDS page: {e}")
                    
            # Attempt to construct a direct URL as a last resort
            logger.info("Attempting to construct a direct URL...")
            direct_url = f"https://www.sigmaaldrich.com/content/dam/sigma-aldrich/docs/Sigma-Aldrich/SDS/{code.upper()}/{product_id}_SIGMA_{product_id}_EN.pdf"
            logger.info(f"Trying direct URL: {direct_url}")
            
            try:
                # Use a fresh session for the direct URL attempt
                direct_session = requests.Session()
                direct_response = direct_session.get(direct_url, timeout=15)
                
                if direct_response.status_code == 200 and ('pdf' in direct_response.headers.get('Content-Type', '').lower() or
                                                         len(direct_response.content) > 1000):
                    with open(output_file, 'wb') as f:
                        f.write(direct_response.content)
                    file_size = len(direct_response.content)
                    logger.info(f"✅ Success! Downloaded via direct URL - Size: {file_size} bytes")
                    successful_downloads.append(f"{product_id},{code},{direct_url},{datetime.now()}")
                    return True
            except Exception as e:
                logger.info(f"Direct URL attempt failed: {e}")
                
                # Increment retry counter and continue
                retry_count += 1
    except Exception as e:
        logger.error(f"Error in download_sds_with_selenium: {e}")
    finally:
        # Add the failure to our tracking
        failed_downloads.append(f"{product_id},{code},FAILED,{datetime.now()}")
        
        # Close the driver
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
    
    return False

def process_product_id(product_id):
    """Process a single product ID, trying various product codes"""
    # Sigma-Aldrich has several product line codes
    product_codes = ['sigald', 'sigma', 'aldrich', 'sial']
    
    for code in product_codes:
        try:
            success = download_sds_with_selenium(product_id, code)
            if success:
                return True
                
            # Sleep a bit between attempts to avoid overwhelming the server
            time.sleep(random.uniform(1.0, 3.0))
        except Exception as e:
            logger.error(f"Error processing {product_id} with code {code}: {e}")
    
    return False

def save_successful_downloads():
    """Save the list of successful downloads to a file"""
    with open(SUCCESS_FILE, "w") as f:
        f.write("product_id,code,url,timestamp\n")  # Header
        for line in successful_downloads:
            f.write(f"{line}\n")
    logger.info(f"Saved successful downloads to {SUCCESS_FILE}")
    
    # Also save failed downloads
    with open(FAILED_FILE, "w") as f:
        f.write("product_id,code,reason,timestamp\n")  # Header
        for line in failed_downloads:
            f.write(f"{line}\n")
    logger.info(f"Saved failed downloads to {FAILED_FILE}")

def crawl_product_numbers(start_id, end_id, max_workers):
    """Crawl product numbers from start_id to end_id using Selenium"""
    logger.info(f"Starting Selenium crawler for product IDs {start_id} to {end_id} with {max_workers} workers")
    
    # Create output directory
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    
    # Import ThreadPoolExecutor here
    from concurrent.futures import ThreadPoolExecutor
    
    product_ids = [str(pid) for pid in range(start_id, end_id + 1)]
    
    # For small ranges, process sequentially to avoid issues
    if len(product_ids) <= 5 or max_workers <= 1:
        for product_id in product_ids:
            process_product_id(product_id)
    else:
        # Use thread pool for larger ranges
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            list(executor.map(process_product_id, product_ids))
    
    # Save the successful downloads
    save_successful_downloads()
    
    logger.info("Crawl completed!")
    logger.info(f"Total successful downloads: {len(successful_downloads)}")

def main():
    parser = argparse.ArgumentParser(description="Download SDS PDFs from Sigma-Aldrich using Selenium")
    parser.add_argument("--start", type=int, default=270709, help="Starting product ID")
    parser.add_argument("--end", type=int, default=270710, help="Ending product ID")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker threads (default: 1)")
    args = parser.parse_args()
    
    if args.start > args.end:
        logger.error("Start ID must be less than or equal to End ID")
        return
    
    if args.end - args.start > 1000:
        logger.warning("Processing a large range may take a long time and could get your IP blocked")
        confirmation = input("Do you want to continue? (y/n): ")
        if confirmation.lower() != 'y':
            return
    
    try:
        crawl_product_numbers(args.start, args.end, args.workers)
    except KeyboardInterrupt:
        logger.info("\nCrawl interrupted by user")
        save_successful_downloads()
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        save_successful_downloads()

if __name__ == "__main__":
    main()