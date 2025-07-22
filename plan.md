# plan.md - SDS Document Management System

## Summary

A secure web-based system to manage Safety Data Sheets (SDS) for chemicals by CAS number. The system should:

- Store PDF SDS files for chemicals identified by CAS#
- Automatically scrape known sources hourly to fill missing SDS files
- Track onsite material quantities per CAS#
- Record physical storage locations (e.g., room numbers)
- Offer a user-friendly interface for browsing, uploading, editing, and auditing

---

## Goals

### ✅ Must-Have
- [ ] Upload and store SDS PDFs associated with CAS#s
- [ ] Metadata model: CAS#, chemical name, PDF URL, source
- [ ] Scraper module: periodically (1h) crawl known sources for missing SDS files
- [ ] Database: track amount onsite per CAS# and room location(s)
- [ ] Web UI to view SDS, room inventories, and add/edit records
- [ ] RESTful API endpoints for all CRUD operations
- [ ] Logging and versioning of SDS uploads (optional retention of previous versions)
- [ ] Auth system for access control (read/write/admin roles)

### 🚀 Nice to Have
- [ ] OCR indexing of PDFs for search
- [ ] Barcode scanning support for CAS# lookup
- [ ] Audit trail for who modified SDS/quantities
- [ ] Mobile-friendly interface
- [ ] Email alerts when SDS is missing for stored chemical
- [ ] Export inventory and SDS metadata to CSV or JSON

---

## System Design

### 📁 Data Models

- **Chemical**
  - `cas_number`: string, unique
  - `name`: string
  - `sds_pdf_path`: string (filesystem or blob path)
  - `source_url`: string (origin of the SDS)
  - `last_checked`: datetime (last attempted scrape)
  - `created_at`, `updated_at`

- **InventoryEntry**
  - `cas_number`: foreign key → Chemical
  - `quantity`: float (grams/mL/etc.)
  - `units`: string
  - `room`: string
  - `last_updated_by`: user ID
  - `updated_at`

- **User**
  - `email`
  - `role`: ['viewer', 'editor', 'admin']

---

## 🕸️ Scraper Logic

- Scheduler: cron/worker runs every 1 hour
- For each chemical without SDS:
  - Search trusted vendors (Sigma-Aldrich, Fisher, etc.)
  - Use keyword match + CAS number
  - If valid PDF found, store and update Chemical record
  - Record `source_url` and `last_checked`
  - Skip if PDF already exists

---

## 🧱 Tech Stack

- **Backend**: Python (FastAPI or Flask), Celery for scheduling
- **Database**: PostgreSQL or MongoDB (for flexibility)
- **Frontend**: React or plain HTML + Tailwind UI
- **Storage**: Local filesystem or AWS S3 for SDS PDFs
- **Authentication**: JWT or session-based login
- **Deployment**: Dockerized services, NGINX reverse proxy

---

## 🔧 Setup Tasks

- [ ] Define schema and create migrations
- [ ] Set up backend routes
- [ ] Configure scraper module
- [ ] Build initial frontend views
- [ ] Add upload form + storage logic
- [ ] Implement hourly job scheduling
- [ ] Seed test chemicals with known CAS#s
- [ ] Deploy dev environment

---

## 🧪 Test Plan

- [ ] Upload PDF manually
- [ ] Fetch and store SDS automatically for missing CAS
- [ ] Add and edit inventory entries
- [ ] Restrict access based on user roles
- [ ] View SDS and metadata from UI
- [ ] Ensure accurate tracking of last scrape attempts

---

## ⏰ Timeline (Estimates)

| Task                          | Owner  | Duration |
|-------------------------------|--------|----------|
| Schema & DB setup             | Dev A  | 1 day    |
| File storage & upload         | Dev B  | 1 day    |
| Scraper + PDF handling        | Dev A  | 2 days   |
| Basic frontend views          | Dev B  | 2 days   |
| Inventory management          | Dev A  | 1 day    |
| Auth + roles                  | Dev B  | 1 day    |
| Testing & polish              | Both   | 2 days   |
| **Total**                     | —      | **10 days** |

---

## 📦 Example Vendors to Scrape

- https://www.sigmaaldrich.com/
- https://www.fishersci.com/
- https://www.alfa.com/
- https://www.tcichemicals.com/
- https://www.thermofisher.com/

---

## 🧯 Safety Considerations

- Only allow PDF uploads (validate MIME type)
- Retain version history of SDS changes
- Notify admin when SDS cannot be found
- Regular backups of SDS file storage

---

## ❓ Open Questions

- Should users be able to delete SDS records?
- What retention policy for old SDS PDFs?
- Multiple rooms per CAS allowed?
- How to deal with synonyms or mixed CAS naming?

---

