#!/usr/bin/env python3

import os
import requests
import random
import time
from bs4 import BeautifulSoup
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('sigma_sds_test')

# Create output directories
OUTPUT_DIR = os.path.join(os.getcwd(), 'sds_files_test')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Page source directory for debugging
PAGE_SOURCE_DIR = os.path.join(os.getcwd(), 'page_sources_test')
os.makedirs(PAGE_SOURCE_DIR, exist_ok=True)

# User agents
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15'
]

def download_sigma_sds(product_id, vendor_code, max_retries=3):
    """Download SDS PDF for a specific product ID and vendor code with retry logic"""
    output_file = os.path.join(OUTPUT_DIR, f"{product_id}_{vendor_code}_SDS.pdf")
    
    # Check if file already exists
    if os.path.exists(output_file):
        logger.info(f"Skipping {output_file} - already exists")
        return True
    
    # Create requests session
    session = requests.Session()
    user_agent = random.choice(USER_AGENTS)
    headers = {
        'User-Agent': user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',  # Removed br encoding which can cause issues
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.sigmaaldrich.com/US/en/search'
    }
    
    # Direct SDS URL for this product ID and code
    sds_url = f"https://www.sigmaaldrich.com/US/en/sds/{vendor_code}/{product_id}?userType=anonymous"
    logger.info(f"Attempting to download SDS from URL: {sds_url}")
    
    # Try multiple times with increasing delays between attempts
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Attempt {attempt} of {max_retries}...")
            
            # Get the SDS page with shorter timeout to avoid long waits
            sds_response = session.get(sds_url, headers=headers, timeout=20)  # Reduced timeout
            
            # Save the response for debugging
            debug_file = os.path.join(PAGE_SOURCE_DIR, f"{product_id}_{vendor_code}_attempt{attempt}.html")
            with open(debug_file, 'wb') as f:
                f.write(sds_response.content)
            
            if sds_response.status_code == 200:
                logger.info(f"Got successful response on attempt {attempt}")
                
                # Check if the response is already a PDF file (direct content)
                if sds_response.content[:4] == b'%PDF':
                    logger.info("Response is a direct PDF! Saving...")
                    with open(output_file, 'wb') as f:
                        f.write(sds_response.content)
                    logger.info(f"Successfully saved SDS PDF to {output_file}")
                    return True
                    
                # If it's not a direct PDF, try to parse as HTML to find PDF links
                logger.info("Response is not a direct PDF. Checking for PDF links...")
                try:
                    soup = BeautifulSoup(sds_response.content, 'html.parser')
                    
                    # Save the HTML content for inspection
                    with open(os.path.join(PAGE_SOURCE_DIR, f"{product_id}_{vendor_code}_parsed.html"), "w", encoding="utf-8") as f:
                        f.write(str(soup.prettify()))
                    
                    # Look for PDF links in the page
                    pdf_links = []
                    for link in soup.find_all('a', href=True):
                        href = link.get('href')
                        if '.pdf' in href.lower() or 'getpdf' in href.lower() or 'download' in href.lower():
                            pdf_links.append(href)
                            logger.info(f"Found potential PDF link: {href}")
                    
                    # Also check for PDF objects/embeds
                    for embed in soup.find_all(['embed', 'object']):
                        src_attr = embed.get('src') or embed.get('data')
                        if src_attr and '.pdf' in src_attr.lower():
                            pdf_links.append(src_attr)
                            logger.info(f"Found PDF embed: {src_attr}")
                    
                    # Search for any URLs containing PDF in the page text
                    pdf_url_pattern = re.compile(r'https?://[^\s"\'>]+\.pdf')
                    text_pdf_urls = pdf_url_pattern.findall(str(soup))
                    for url in text_pdf_urls:
                        if url not in pdf_links:
                            pdf_links.append(url)
                            logger.info(f"Found PDF URL in page text: {url}")
                    
                    # Handle any PDF links found
                    if pdf_links:
                        base_url = "https://www.sigmaaldrich.com"
                        for link in pdf_links:
                            try:
                                # Handle relative URLs
                                if not link.startswith('http'):
                                    if link.startswith('/'):
                                        link = f"{base_url}{link}"
                                    else:
                                        link = f"{base_url}/{link}"
                                
                                logger.info(f"Attempting to download PDF from link: {link}")
                                pdf_response = session.get(link, headers=headers, timeout=15)
                                
                                # Check if response is a PDF
                                content_type = pdf_response.headers.get('Content-Type', '')
                                is_pdf = ('application/pdf' in content_type.lower() or 
                                          pdf_response.content[:4] == b'%PDF' or 
                                          pdf_response.content[:5] == b'%PDF-')
                                
                                if is_pdf:
                                    # Save the PDF
                                    with open(output_file, 'wb') as f:
                                        f.write(pdf_response.content)
                                    logger.info(f"Successfully downloaded PDF to {output_file}")
                                    return True
                                else:
                                    logger.warning(f"Link didn't return a PDF: {content_type}")
                            except Exception as e:
                                logger.error(f"Error downloading PDF from link: {e}")
                    else:
                        logger.warning(f"No PDF links found in the HTML response")
                except Exception as e:
                    logger.error(f"Error parsing HTML: {e}")
            else:
                logger.warning(f"HTTP error {sds_response.status_code} on attempt {attempt}")
            
            # Wait between retries but not too long
            if attempt < max_retries:
                wait_time = random.uniform(3, 5)
                logger.info(f"Waiting {wait_time:.1f} seconds before retry...")
                time.sleep(wait_time)
                
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout occurred on attempt {attempt}")
            if attempt < max_retries:
                wait_time = random.uniform(2, 4) 
                logger.info(f"Waiting {wait_time:.1f} seconds before retry...")
                time.sleep(wait_time)
        except requests.exceptions.ConnectionError:
            logger.warning(f"Connection error on attempt {attempt}")
            if attempt < max_retries:
                wait_time = random.uniform(3, 6)
                logger.info(f"Waiting {wait_time:.1f} seconds before retry...")
                time.sleep(wait_time)
        except Exception as e:
            logger.error(f"Error on attempt {attempt}: {e}")
            if attempt < max_retries:
                wait_time = random.uniform(2, 4)
                logger.info(f"Waiting {wait_time:.1f} seconds before retry...")
                time.sleep(wait_time)
    
    # If we get here, all attempts failed
    logger.error(f"Failed to download SDS for {product_id} with code {vendor_code} after {max_retries} attempts")
    return False

def main():
    # Test with specific product ID that previously worked
    start_id = 270709
    end_id = 270710  # Just testing one ID for now
    
    # Preferred vendor code to try first
    preferred_vendor_code = 'sigald'
    
    successful_ids = []
    failed_ids = []
    
    logger.info(f"Starting sequential test of product IDs {start_id} through {end_id}")
    
    for product_id in range(start_id, end_id + 1):
        test_product_id = str(product_id)
        logger.info(f"\n\nTesting product ID: {test_product_id}")
        
        # Try with the preferred vendor code first
        logger.info(f"Trying with vendor code: {preferred_vendor_code}")
        success = download_sigma_sds(test_product_id, preferred_vendor_code)
        
        if success:
            logger.info(f"✅ Successfully downloaded SDS for product {test_product_id} with vendor code {preferred_vendor_code}")
            successful_ids.append(test_product_id)
        else:
            # If the preferred code failed, try other vendor codes
            other_codes = ['aldrich', 'sigma', 'sial', 'supelco']
            logger.info(f"Trying other vendor codes for product ID {test_product_id}")
            
            for vendor_code in other_codes:
                logger.info(f"Trying with vendor code: {vendor_code}")
                success = download_sigma_sds(test_product_id, vendor_code)
                
                if success:
                    logger.info(f"✅ Successfully downloaded SDS for product {test_product_id} with vendor code {vendor_code}")
                    successful_ids.append(test_product_id)
                    break
            
            if not success:
                logger.error(f"❌ Failed to download SDS for product {test_product_id} with all vendor codes")
                failed_ids.append(test_product_id)
        
        # Add a delay between product IDs to avoid rate limiting
        if product_id < end_id:
            wait_time = random.uniform(3, 5)
            logger.info(f"Waiting {wait_time:.1f} seconds before trying next product ID...")
            time.sleep(wait_time)
    
    # Summary
    logger.info("\n\n===== SUMMARY =====")
    logger.info(f"Successful downloads: {len(successful_ids)} - IDs: {successful_ids}")
    logger.info(f"Failed downloads: {len(failed_ids)} - IDs: {failed_ids}")

if __name__ == "__main__":
    main()
