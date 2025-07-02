if __name__ == "__main__":
    from backend.core.sds_manager import SDSManager
    from backend.database.init_db import SessionLocal

    db = SessionLocal()
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
    db.close() 