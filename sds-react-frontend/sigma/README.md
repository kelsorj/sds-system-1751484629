# Sigma Aldrich SDS Scraper

This script automates the download of Safety Data Sheets (SDS) from Sigma Aldrich's website using CAS numbers from a CSV file.

## Features

- Downloads SDS PDFs from Sigma Aldrich
- Extracts chemical safety information
- Works on both macOS and CentOS
- Handles large lists of CAS numbers
- Tracks successful and failed downloads

## Prerequisites

- Python 3.7+
- Google Chrome or Chromium browser
- ChromeDriver (compatible with your Chrome version)

## Setup

### On CentOS

1. Run the setup script:
   ```bash
   chmod +x setup_centos.sh
   sudo ./setup_centos.sh
   ```

### On macOS

1. Install Homebrew if you don't have it:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install Chrome and ChromeDriver:
   ```bash
   brew install --cask google-chrome
   brew install chromedriver
   ```

3. Install Python dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```

## Usage

1. Prepare a CSV file with CAS numbers in the third column (or modify the script to match your CSV format).
2. Place your CSV file in the same directory as the script.
3. Run the scraper:
   ```bash
   python3 scraper.py
   ```

## Output

- Downloaded SDS files are saved in the `SDS` directory.
- A log of failed downloads is saved in `failed_downloads.txt`.

## Troubleshooting

### Common Issues

1. **Chrome version mismatch**: Ensure Chrome and ChromeDriver versions match.
   - Check Chrome version: `google-chrome --version`
   - Download matching ChromeDriver: https://chromedriver.chromium.org/downloads

2. **Permission denied**: Run the script with appropriate permissions or use `chmod +x` on the script.

3. **Missing dependencies**: Install required Python packages:
   ```bash
   pip3 install -r requirements.txt
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
