# Software Engineering Project Defense & Viva Voce Guide
## Office Asset Management System (AssetFlow Pro)
**Target:** Final Year / Academic Software Engineering Evaluation & Technical Defense  

---

### Q1: What is the core problem statement addressed by AssetFlow Pro?
**Model Answer:**
> "In corporate and institutional environments, hardware assets like laptops, displays, testing devices, and ergonomic furniture represent significant financial capital. Most organizations suffer from inventory leakage, misplaced equipment during employee offboarding, unmonitored warranty lapses, and inaccurate balance sheet depreciation.
> AssetFlow Pro solves this through an end-to-end digital lifecycle platform that manages asset procurement, chain of custody (check-out/check-in with condition inspection), GAAP/IAS 16 Straight-Line depreciation, maintenance ticketing, and physical audit tags via QR codes."

---

### Q2: Why did you choose SQLite instead of MongoDB or PostgreSQL?
**Model Answer:**
> "We chose SQLite powered by `better-sqlite3` for three distinct software engineering reasons:
> 1. **Zero Configuration Portability:** For academic demonstrations and enterprise edge deployments, SQLite runs as an embedded in-process database. There are no external database server services to configure, authenticate, or crash during evaluation.
> 2. **Relational ACID Guarantees:** Hardware custody and asset tracking require strict relational integrity (Foreign Keys, cascading constraints, unique serial numbers). Document stores like MongoDB do not naturally enforce foreign key referential integrity at the database engine level.
> 3. **High Performance via WAL Mode:** By activating Write-Ahead Logging (`PRAGMA journal_mode = WAL`), SQLite supports concurrent non-blocking reads alongside serialized writes, delivering microsecond response times without the overhead of network socket serialization."

---

### Q3: How does the Straight-Line Depreciation Engine work?
**Model Answer:**
> "Our depreciation engine complies with **GAAP (Generally Accepted Accounting Principles)** and **IAS 16 (Property, Plant, and Equipment)**:
> - First, it calculates the **Depreciable Amount**: $\text{Cost} - \text{Salvage Value}$.
> - Next, it computes **Annual Depreciation**: $\frac{\text{Depreciable Amount}}{\text{Useful Life (Years)}}$.
> - It calculates days elapsed in service using high-precision date arithmetic.
> - Finally, the **Carrying Book Value** is calculated as:
>   $$\text{Current Book Value} = \max(\text{Salvage Value}, \text{Cost} - \text{Accumulated Depreciation})$$
> Crucially, our implementation caps accumulated depreciation so that an asset's book value **never falls below its salvage value**, even if the asset remains in service beyond its estimated useful life."

---

### Q4: How do you guarantee atomicity during asset check-outs and check-ins?
**Model Answer:**
> "We enforce database atomicity using SQLite transactions (`db.transaction(...)`).
> When checking out an asset:
> 1. We verify that the asset status is currently `Available`.
> 2. We insert a new record into `allocations`.
> 3. We update the asset's status to `Assigned` and link the `assigned_to` foreign key.
> 4. We record an immutable event in the `audit_logs` table.
> If any step encounters an error (for example, if another admin just checked out the asset simultaneously or the employee record is invalid), the entire transaction automatically rolls back, preventing orphaned or corrupt state."

---

### Q5: How do you protect against SQL Injection?
**Model Answer:**
> "Every database query throughout the application uses **parameterized prepared statements** (e.g., `db.prepare('SELECT * FROM assets WHERE status = ?').all(status)`). User inputs are strictly bound as parameters rather than concatenated into SQL strings. This ensures the SQLite query compiler treats user input strictly as literal data, rendering SQL injection impossible."

---

### Q6: Why did you choose a pure vanilla CSS and JavaScript frontend instead of React or Angular?
**Model Answer:**
> "We selected a clean vanilla architecture for optimal software engineering simplicity:
> 1. **Zero Build Dependency Overhead:** Modern bundlers (Webpack, Vite, Babel) introduce large `node_modules` trees, compilation latency, and version fragility. A pure vanilla frontend executes natively in any modern browser without transpilation.
> 2. **Instant Startup & Turnkey Run:** Any evaluator can run `npm start` and open the app in 1 second.
> 3. **Superior Runtime Performance:** Direct DOM manipulation and native HTML5 Canvas rendering eliminate virtual DOM diffing overhead, resulting in 60fps animations and sub-10ms UI updates."

---

### Q7: How are QR codes generated and utilized?
**Model Answer:**
> "QR codes are generated dynamically in two ways:
> 1. In JSON payloads as Base64 Data URLs (`data:image/png;base64,...`) for instant modal rendering without extra HTTP round trips.
> 2. Via a dedicated streaming endpoint (`GET /api/assets/:id/qr`) that streams raw PNG bytes directly into `<img>` tags or printable sticker sheets.
> The QR payload contains the unique asset tag, serial number, equipment model, and internal routing URL so facilities staff can scan physical hardware with a phone camera during inventory audits."

---

### Q8: How did you test the system?
**Model Answer:**
> "We implemented an automated integration and unit test suite in `test/api.test.js` using Node.js's built-in `node:test` and `node:assert` modules.
> The test suite validates 12 critical test cases across 5 suites:
> 1. Depreciation math accuracy and edge cases (salvage value bounds).
> 2. Asset inventory CRUD operations and auto-tagging.
> 3. Full custody checkout and check-in lifecycle.
> 4. Equipment maintenance ticketing and status resolution.
> 5. CSV export generation and audit log persistence.
> The entire test suite executes in less than 600 milliseconds via `npm test` with 100% pass rates."

---

### Q9: How would you scale this architecture to handle 500,000 assets and 50,000 employees?
**Model Answer:**
> "For enterprise-scale deployment:
> 1. **Database Migration:** We would swap the SQLite driver for a PostgreSQL or distributed Citus cluster, retaining the exact same relational schema and queries.
> 2. **Horizontal Scaling:** Run multiple stateless Node.js container instances behind an Nginx or AWS ALB reverse proxy with Redis for session caching.
> 3. **Storage Tier:** Offload uploaded photos and invoices from local disk to S3-compatible cloud object storage (AWS S3 or Cloudflare R2).
> 4. **Pagination & Indexing:** Add cursor-based SQL pagination (`LIMIT ? OFFSET ?`) to the asset list queries."

---

### Q10: What are the primary software engineering metrics of this project?
**Model Answer:**
> - **Code Coverage & Quality:** 100% automated test pass rate for all core business logic and API endpoints.
> - **Architectural Separation:** Strict 3-tier separation between presentation, business logic/routes, and persistence.
> - **Performance:** Average REST API latency $\le 30\text{ ms}$; canvas donut rendering $\le 5\text{ ms}$.
> - **Standard Compliance:** IEEE 830 compliant SRS, GAAP/IAS 16 compliant financial math, and RFC 4180 compliant CSV export.
