const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

let dbPath;
let db;

if (isVercel) {
  const tmpDataDir = '/tmp';
  const tmpDbPath = path.join(tmpDataDir, 'assets.db');
  const bundledDbPath = path.join(__dirname, '../../data/assets.db');

  if (!fs.existsSync(tmpDbPath) && fs.existsSync(bundledDbPath)) {
    try {
      fs.copyFileSync(bundledDbPath, tmpDbPath);
      console.log('Seeded database copied to /tmp/assets.db');
    } catch (e) {
      console.warn('Could not copy bundled DB to /tmp, will initialize new DB:', e.message);
    }
  }

  dbPath = fs.existsSync(tmpDbPath) ? tmpDbPath : (fs.existsSync(bundledDbPath) ? bundledDbPath : tmpDbPath);
  db = new Database(dbPath);
  try {
    db.pragma('journal_mode = DELETE');
  } catch (e) {
    db.pragma('journal_mode = MEMORY');
  }
  db.pragma('foreign_keys = ON');
} else {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dbPath = path.join(dataDir, 'assets.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

// Initialize database schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      head_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      useful_life_years INTEGER DEFAULT 4,
      salvage_percentage REAL DEFAULT 10.0,
      icon TEXT DEFAULT 'box',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building TEXT NOT NULL,
      floor TEXT NOT NULL,
      room TEXT NOT NULL,
      code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      designation TEXT,
      phone TEXT,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag TEXT NOT NULL UNIQUE,
      serial_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
      model TEXT,
      manufacturer TEXT,
      purchase_date DATE NOT NULL,
      purchase_cost REAL NOT NULL,
      salvage_value REAL DEFAULT 0.0,
      useful_life_years INTEGER DEFAULT 4,
      warranty_expiry DATE,
      status TEXT DEFAULT 'Available' CHECK(status IN ('Available', 'Assigned', 'In Maintenance', 'Decommissioned', 'Disposed')),
      condition TEXT DEFAULT 'Excellent' CHECK(condition IN ('New', 'Excellent', 'Good', 'Fair', 'Damaged')),
      location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      specifications TEXT,
      notes TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      allocated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      expected_return_date DATE,
      returned_date DATETIME,
      allocated_by TEXT DEFAULT 'IT Administrator',
      checkout_condition TEXT DEFAULT 'Good',
      return_condition TEXT,
      status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Returned', 'Overdue')),
      checkout_notes TEXT,
      return_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL UNIQUE,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      issue_description TEXT NOT NULL,
      priority TEXT DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')),
      status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
      reported_by TEXT DEFAULT 'Staff Member',
      assigned_vendor TEXT,
      cost REAL DEFAULT 0.0,
      reported_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_date DATETIME,
      resolution_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      performed_by TEXT DEFAULT 'IT Admin',
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'IT Administrator',
      avatar_color TEXT DEFAULT '#4f46e5',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
    CREATE INDEX IF NOT EXISTS idx_assets_assigned ON assets(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_allocations_asset ON allocations(asset_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_employee ON allocations(employee_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_records(asset_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);
}

initSchema();

module.exports = {
  db,
  initSchema
};
