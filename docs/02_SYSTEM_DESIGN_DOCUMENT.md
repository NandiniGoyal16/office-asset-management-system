# System Design Document (SDD)
## Office Asset Management System (AssetFlow Pro)
**Document Version:** 1.0.0  
**Project Classification:** Software Engineering Architecture Specification  

---

## 1. System Architecture

AssetFlow Pro follows a classic **Layered 3-Tier Client-Server Architecture** designed for high throughput, zero configuration overhead, and deterministic execution.

```mermaid
flowchart TD
    subgraph Presentation_Tier["Presentation Tier (Client Browser)"]
        UI["SPA Interface (HTML5 / Glassmorphism CSS)"]
        AppController["App Controller (app.js)"]
        APIClient["API Service Client (api.js)"]
        ChartsEngine["Canvas Visualizer (charts.js)"]
        UI --> AppController
        AppController --> APIClient
        AppController --> ChartsEngine
    end

    subgraph Application_Tier["Application Tier (Node.js & Express)"]
        Server["Express Router & HTTP Server (server.js)"]
        AssetRoutes["Asset Lifecycle Routes (/api/assets)"]
        AllocRoutes["Allocation Engine (/api/allocations)"]
        MaintRoutes["Maintenance Service (/api/maintenance)"]
        ReportRoutes["Reporting & Analytics (/api/reports)"]
        CalcUtil["GAAP Depreciation Engine (calculator.js)"]
        QRUtil["QR Generator (qrcode)"]

        Server --> AssetRoutes
        Server --> AllocRoutes
        Server --> MaintRoutes
        Server --> ReportRoutes
        AssetRoutes --> CalcUtil
        AssetRoutes --> QRUtil
        ReportRoutes --> CalcUtil
    end

    subgraph Data_Tier["Data Tier (ACID Storage)"]
        DB[(better-sqlite3 Database Engine)]
        WALFile[assets.db-wal]
        DBFile[assets.db]
        DB --> WALFile
        DB --> DBFile
    end

    APIClient <-->|RESTful JSON & File Streams| Server
    AssetRoutes <--> DB
    AllocRoutes <--> DB
    MaintRoutes <--> DB
    ReportRoutes <--> DB
```

---

## 2. Entity-Relationship Diagram (ERD)

The database schema is normalized to **Third Normal Form (3NF)** with strict foreign key constraints and indexed columns for fast lookup.

```mermaid
erDiagram
    DEPARTMENTS ||--o{ EMPLOYEES : "employs"
    CATEGORIES ||--o{ ASSETS : "classifies"
    LOCATIONS ||--o{ ASSETS : "houses"
    EMPLOYEES ||--o{ ASSETS : "currently_holds"
    ASSETS ||--o{ ALLOCATIONS : "checked_out_in"
    EMPLOYEES ||--o{ ALLOCATIONS : "assigned_to"
    ASSETS ||--o{ MAINTENANCE_RECORDS : "undergoes"

    DEPARTMENTS {
        int id PK
        string name
        string code
        string head_name
        datetime created_at
    }

    CATEGORIES {
        int id PK
        string name
        string code
        int useful_life_years
        real salvage_percentage
        string icon
    }

    LOCATIONS {
        int id PK
        string building
        string floor
        string room
        string code
    }

    EMPLOYEES {
        int id PK
        string employee_id UK
        string full_name
        string email UK
        int department_id FK
        string designation
        string phone
        string status
    }

    ASSETS {
        int id PK
        string asset_tag UK
        string serial_number UK
        string name
        int category_id FK
        string model
        string manufacturer
        date purchase_date
        real purchase_cost
        real salvage_value
        int useful_life_years
        date warranty_expiry
        string status
        string condition
        int location_id FK
        int assigned_to FK
        text specifications
        text notes
    }

    ALLOCATIONS {
        int id PK
        int asset_id FK
        int employee_id FK
        datetime allocated_date
        date expected_return_date
        datetime returned_date
        string allocated_by
        string checkout_condition
        string return_condition
        string status
        text checkout_notes
        text return_notes
    }

    MAINTENANCE_RECORDS {
        int id PK
        string ticket_number UK
        int asset_id FK
        text issue_description
        string priority
        string status
        string reported_by
        string assigned_vendor
        real cost
        datetime reported_date
        datetime completed_date
        text resolution_notes
    }

    AUDIT_LOGS {
        int id PK
        string action
        string entity_type
        int entity_id
        string performed_by
        text details
        datetime timestamp
    }
```

---

## 3. Sequence Diagrams

### 3.1 Asset Allocation / Check-out Sequence
```mermaid
sequenceDiagram
    autonumber
    actor Admin as IT Administrator
    participant UI as Dashboard UI
    participant API as Allocations Route
    participant DB as SQLite Database
    participant Audit as Audit Trail

    Admin->>UI: Selects Asset & clicks "Assign"
    UI->>Admin: Displays Checkout Modal with Employee dropdown
    Admin->>UI: Selects Employee (EMP-1002) & submits
    UI->>API: POST /api/allocations/checkout {asset_id, employee_id}
    Note over API,DB: Begin ACID Transaction
    API->>DB: Check if asset.status == 'Available'
    DB-->>API: Status is Available
    API->>DB: INSERT INTO allocations (...)
    API->>DB: UPDATE assets SET status='Assigned', assigned_to=2
    API->>Audit: INSERT INTO audit_logs (CHECKOUT, ...)
    Note over API,DB: Commit Transaction
    API-->>UI: 201 Created {allocationId, assetTag}
    UI->>Admin: Toast notification: "Asset successfully assigned"
```

### 3.2 Equipment Maintenance & Repair Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Admin as IT Support / Technician
    participant UI as Maintenance UI
    participant API as Maintenance Route
    participant DB as SQLite Database

    Admin->>UI: Logs repair ticket for malfunctioning switch
    UI->>API: POST /api/maintenance {asset_id, issue, priority: 'Critical'}
    API->>DB: INSERT INTO maintenance_records (ticket_number: 'MNT-2024-004')
    API->>DB: UPDATE assets SET status = 'In Maintenance'
    API-->>UI: 201 Created Ticket
    Note over Admin,API: Later: Vendor completes component replacement
    Admin->>UI: Clicks "Resolve Ticket", enters cost: $120.00, check "Return to Available"
    UI->>API: PUT /api/maintenance/:id {status: 'Completed', cost: 120.00, return_to_available: true}
    API->>DB: UPDATE maintenance_records SET status='Completed', cost=120.00
    API->>DB: UPDATE assets SET status='Available'
    API-->>UI: 200 OK
    UI->>Admin: Asset marked Available and inventory updated
```

---

## 4. RESTful API Specification

| Endpoint | Method | Description | Request Body / Query | Success Response |
|:---------|:-------|:------------|:---------------------|:-----------------|
| `/api/reports/dashboard` | `GET` | Aggregated executive KPIs | None | `{ summary, categoryDistribution, ... }` |
| `/api/assets` | `GET` | Filtered asset list | `status, category_id, search` | `{ count, data: [ ...assets with financials ] }` |
| `/api/assets/:id` | `GET` | Asset details, QR, history | None | `{ data: { ...asset, financials, qrCodeDataUrl } }` |
| `/api/assets/:id/qr` | `GET` | Stream QR Code image | None | Binary `image/png` stream |
| `/api/assets` | `POST` | Register new asset | JSON asset schema | `201 Created { id, asset_tag }` |
| `/api/assets/:id` | `PUT` | Update asset attributes | JSON fields | `200 OK { message }` |
| `/api/allocations` | `GET` | List custody records | `status: 'Active' / 'ALL'` | `{ count, data: [ ...allocations ] }` |
| `/api/allocations/checkout` | `POST` | Check-out equipment | `{ asset_id, employee_id }` | `201 Created { allocationId }` |
| `/api/allocations/checkin` | `POST` | Return equipment | `{ allocation_id, return_condition }`| `200 OK { message }` |
| `/api/maintenance` | `GET` | List service tickets | `status, priority` | `{ count, data: [ ...tickets ] }` |
| `/api/maintenance` | `POST` | Open service ticket | `{ asset_id, issue, priority }` | `201 Created { ticketNumber }` |
| `/api/maintenance/:id` | `PUT` | Resolve service ticket | `{ status, cost, notes }` | `200 OK { message }` |
| `/api/reports/depreciation`| `GET` | Straight-Line valuation table | None | `{ count, data: [ ...depreciation ] }` |
| `/api/reports/export-csv` | `GET` | Downloadable CSV Register | None | `text/csv` attachment |
| `/api/audit` | `GET` | Compliance audit log | `limit` (default 100) | `{ count, data: [ ...audit logs ] }` |
