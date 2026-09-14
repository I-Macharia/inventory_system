# Inventory System

A full-stack inventory management application built with Flask for the backend and React + Vite for the frontend.

The project is designed for stock management, product and shop records, stock updates through spreadsheet upload, invoice import, and simple admin/user-access workflows.

## Overview

- Backend: Flask, SQLAlchemy, SQLite, JWT auth
- Frontend: React, Vite, Tailwind-based UI
- Core workflows:
  - login and access requests
  - product and shop management
  - master stock updates
  - bulk stock import from Excel or CSV
  - invoice upload / parsing
  - dashboard and operational pages

## Repository structure

```text
.
├── app/
│   ├── __init__.py
│   ├── database.py
│   ├── models.py
│   └── services/
│       └── pdf_parser.py
├── inventory-frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── templates/
├── app.py
├── main.py
├── requirements.txt
├── inventory.db
├── tests/
└── README.md
```

## Backend setup

```bash
cd /home/bobbybob/Documents/inventory_system
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

The default backend runs from `app.py`, which starts the Flask application defined in `app/__init__.py`.

## Frontend setup

```bash
cd /home/bobbybob/Documents/inventory_system/inventory-frontend
npm install
npm run dev -- --host 0.0.0.0
```

The frontend expects the backend at the API URL configured in its environment.

Example:

```bash
VITE_API_URL=http://127.0.0.1:8000
```

## Authentication and access flow

The app uses JWT-based authentication for protected API routes.

- login is handled through `/login`
- access requests are submitted through `/auth/request-access`
- admin users can review and approve requests from the admin panel
- protected routes require the `Authorization: Bearer <token>` header

## Stock import workflow

The stock import flow supports Excel and CSV uploads.

### Download template

From the stock receive page, users can download a template file before uploading their inventory data. The sheet is expected to include:

- `item_code`
- `gpm_code`
- `description`
- `quantity`

### Upload endpoint

- `GET /stock/import-template` downloads the XLSX template
- `POST /stock/import` uploads the filled template or CSV file

The backend validates the file type, maps common column aliases, updates existing stock entries, and creates missing product records where required.

## Primary app features

- product management
- shop management
- stock receiving and stock updates
- bulk Excel/CSV stock import
- invoice parsing and upload
- dashboard and reporting pages
- admin user request approval workflow

## Production notes

- The project is currently standardized around a single Flask backend.
- Base44-specific assumptions should remain out of the live app contract unless intentionally reintroduced for a specific integration.
- Barcode printing has been deferred to a later milestone so the operational stock and admin flows remain stable first.

## Running tests

The repository includes lightweight tests for key backend behavior.

```bash
cd /home/bobbybob/Documents/inventory_system
source venv/bin/activate
python -m pytest
```

## Development guidance

For normal development work:

1. Start the Flask backend.
2. Start the Vite frontend.
3. Log in with a valid user or request access as needed.
4. Use the stock import template before uploading inventory spreadsheets.

## Notes

This project is intended for internal operational use and browser-based inventory tasks. If the business expands, the next natural milestones are deployment hardening, admin process polishing, and barcode printing support.
