#!/bin/bash
# Setup script for Sigma Aldrich SDS Scraper on CentOS
# Run as root or with sudo

# Update package lists
echo "Updating package lists..."
sudo yum update -y

# Install required system packages
echo "Installing system dependencies..."
sudo yum install -y python3 python3-pip python3-devel gcc make wget unzip

# Install Chrome (Google Chrome or Chromium)
echo "Installing Google Chrome..."
sudo tee /etc/yum.repos.d/google-chrome.repo <<EOL
[google-chrome]
name=google-chrome
baseurl=https://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl-ssl.google.com/linux/linux_signing_key.pub
EOL

sudo yum install -y google-chrome-stable

# Alternatively, install Chromium:
# sudo dnf install -y chromium

# Install ChromeDriver
CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | cut -d. -f1-3)
CHROMEDRIVER_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION}")

echo "Installing ChromeDriver version $CHROMEDRIVER_VERSION..."
wget -q "https://chromedriver.storage.googleapis.com/${CHROMEDRIVER_VERSION}/chromedriver_linux64.zip"
unzip chromedriver_linux64.zip
chmod +x chromedriver
sudo mv chromedriver /usr/local/bin/
rm chromedriver_linux64.zip

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

echo "Setup complete!"
echo "To run the scraper, use: python3 scraper.py"
