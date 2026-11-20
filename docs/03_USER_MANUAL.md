# User Operations & Manual
## AssetFlow Pro - Office Asset Management System
**User Role:** IT Systems Administrator / Department Supervisor / Academic Evaluator  

---

## 1. Authentication Portal & Sign-In (Localhost:3000)

Upon navigating to `http://localhost:3000`, the system displays the **AssetFlow Authentication & Sign-In Portal** before granting access to core data and dashboard views.

### 1.1 Quick 1-Click Demo Login
For evaluation and rapid testing:
- **Admin Demo Button:** Logs in immediately with `admin@company.com` / `admin123` as **IT Administrator** (Full Administrative Access).
- **Manager Demo Button:** Logs in immediately with `sarah.chen@company.com` / `user123` as **Asset Manager**.

### 1.2 User Registration (Sign Up)
1. Click the **Sign Up / Register** tab at the top of the authentication card.
2. Enter your Full Name, Work Email, Desired Username, Role (`IT Administrator`, `Asset Manager`, `Logistics Officer`, or `Staff Member`), and Password (min 6 characters).
3. Click **`Create Account & Enter Portal`**. The system creates your cryptographically salted PBKDF2 user record, opens an active session, and redirects to the dashboard.

### 1.3 User Profile & Sign Out
- The active user's initials, full name, and role are displayed dynamically in both the left sidebar footer and the top navigation header.
- Click the **`Sign Out`** button (either in the sidebar footer or top header) to terminate your session token and safely return to the login portal.

---

## 2. Quick Navigation Overview

AssetFlow Pro features an intuitive left-hand sidebar navigation bar organized into two operational tiers:
1. **Core Management:**
   - **Dashboard:** High-level metrics, asset distribution donut chart, department allocation bars, upcoming 90-day warranty expirations, and recent audit activity.
   - **Asset Inventory:** Searchable registry of all hardware, monitors, ergonomic furniture, and testing devices with instant category and status filtering.
   - **Allocations & Return:** Complete custody chain tracking equipment checked out to employees.
   - **Maintenance & Repairs:** Service ticketing system for hardware faults and vendor warranty claims.
2. **Valuation & Operations:**
   - **Depreciation Engine:** Real-time GAAP straight-line carrying value and amortization.
   - **QR Sticker Station:** Printable adhesive tags featuring company branding and QR codes for physical tagging.
   - **Audit Trail:** Comprehensive chronological record of all system modifications.

---

## 2. Step-by-Step Operations Guide

### 2.1 Registering a New Office Asset
1. From any view, click the blue **`Register Asset`** button in the top navigation header.
2. Complete the modal form:
   - **Asset Name** (e.g. *MacBook Pro 16" M3 Max* or *Dell UltraSharp 27" 4K*).
   - **Category:** Select from Laptops, Displays, Furniture, Mobile, Networking, or Audio/Video.
   - **Manufacturer & Model:** Hardware specifications.
   - **Serial Number:** Enter manufacturer serial, or leave blank for auto-generated tracking code.
   - **Acquisition Date:** Date purchased.
   - **Purchase Cost ($):** Gross capitalized cost.
   - **Salvage Value ($):** Residual salvage value at end of useful life (default: $0).
   - **Useful Life (Years):** Amortization duration (default: 4 years).
   - **Physical Location:** Select HQ Building, Floor, and Room.
3. Click **`Save to Inventory`**. The asset is immediately registered as `Available` and an entry is logged in the audit trail.

---

### 2.2 Assigning (Checking Out) an Asset to an Employee
1. Navigate to **Asset Inventory**.
2. Find the desired asset (must have status `Available`).
3. Click the blue **`Assign`** button on the right side of the row.
4. In the checkout modal:
   - Select the target employee from the dropdown list (shows Employee ID, Name, and Department).
   - Set an optional **Expected Return Date**.
   - Enter any checkout notes (e.g., *Issued with power adapter and USB-C hub*).
5. Click **`Complete Assignment`**.
6. The asset status immediately flips to `Assigned` with an indigo badge, and the employee is now recorded as the active custodian.

---

### 2.3 Checking In / Returning an Asset to Inventory
When an employee returns hardware (e.g., upon project completion or offboarding):
1. Navigate to **Allocations & Return** (or locate the assigned asset in **Asset Inventory**).
2. Click **`Check-in / Return`**.
3. Perform physical inspection and select the return condition:
   - `New / Mint`
   - `Excellent`
   - `Good (Normal Wear)`
   - `Fair (Scratches/Blemishes)`
   - `Damaged (Needs Repair)`
4. Enter any inspection notes.
5. Click **`Confirm Return`**.
6. The custody record is archived with the return date, and the asset status immediately reverts to `Available`.

---

### 2.4 Opening and Resolving Maintenance Tickets
1. If an asset suffers hardware failure or requires routine cleaning:
   - Click the wrench icon button (**`Log Issue`**) next to the asset in the inventory table.
   - Describe the issue (e.g., *Port 1 packet loss on Cisco Switch*).
   - Select Priority: `Low`, `Medium`, `High`, or `Critical`.
   - Enter assigned vendor or technician.
   - Click **`Create Ticket`**.
2. The asset is automatically placed in `In Maintenance` status (amber badge).
3. To resolve:
   - Go to **Maintenance & Repairs**.
   - Click **`Update / Resolve`** on the ticket.
   - Enter actual incurred repair cost and resolution notes.
   - Keep the checkbox *"Return asset to Available inventory status"* checked.
   - Click **`Save Resolution`**.

---

### 2.5 Printing Asset QR Sticker Tags
1. Navigate to **QR Sticker Station**.
2. All assets are presented as standardized hardware tags including:
   - Corporate Header: `OFFICE ASSET INVENTORY TAG`
   - Unique Asset Tag (e.g. `AST-2024-001`)
   - High-contrast scannable QR Code
   - Hardware Name and Serial Number
   - Legal ownership disclaimer: `Property of Corp • Do Not Remove`
3. Click **`Print Sticker Sheets`** or press `Ctrl + P`. The print CSS automatically hides sidebar, headers, and UI chrome, leaving only the clean sticker sheet formatted for paper or adhesive sticker printers!

---

### 2.6 Exporting Inventory Register to CSV
1. In the top header bar, click **`Export CSV`**.
2. The browser automatically downloads `Office_Asset_Register.csv`.
3. The CSV contains all 16 attributes including Tag, Serial, Name, Category, Acquisition Cost, Current Book Value, Accumulated Depreciation, Custodian, and Location, ready for Excel or Google Sheets.
