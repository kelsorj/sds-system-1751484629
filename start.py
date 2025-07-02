#!/usr/bin/env python3
"""
Startup script for the SDS/GHS Management System
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def main():
    """Main startup function"""
    print("Starting SDS/GHS Management System...")
    
    try:
        # Import and run the FastAPI application
        from backend.main import app
        import uvicorn
        from config.settings import settings
        
        print(f"Application: {settings.APP_NAME}")
        print(f"Version: {settings.APP_VERSION}")
        print(f"Company: {settings.COMPANY_NAME}")
        print(f"Server: http://{settings.HOST}:{settings.PORT}")
        print(f"API Docs: http://{settings.HOST}:{settings.PORT}/api/docs")
        print("\nPress Ctrl+C to stop the server")
        
        uvicorn.run(
            "backend.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"Import error: {e}")
        print("Please make sure all dependencies are installed:")
        print("pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 