const { db } = require('./database');
const { hashPassword, generateSalt } = require('../utils/auth');

function seedUsers() {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount > 0) {
      return;
    }

    console.log('Seeding initial authentication users...');
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, salt, full_name, role, avatar_color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const adminSalt = generateSalt();
    const adminHash = hashPassword('admin123', adminSalt);
    insertUser.run('admin', 'admin@company.com', adminHash, adminSalt, 'IT Administrator', 'IT Administrator', '#4f46e5');

    const demoSalt = generateSalt();
    const demoHash = hashPassword('user123', demoSalt);
    insertUser.run('sarah', 'sarah.chen@company.com', demoHash, demoSalt, 'Sarah Chen', 'Asset Manager', '#059669');

    console.log('Seeded default portal accounts: admin@company.com / admin123, sarah.chen@company.com / user123');
  } catch (err) {
    console.error('Error seeding users:', err.message);
  }
}

function seedDatabase() {
  seedUsers();

  const assetCount = db.prepare('SELECT COUNT(*) as count FROM assets').get().count;
  if (assetCount > 0) {
    console.log('Database already populated. Skipping seed.');
    return;
  }

  console.log('Seeding initial office asset management data...');

  const insertDept = db.prepare('INSERT INTO departments (name, code, head_name) VALUES (?, ?, ?)');
  const depts = [
    ['Engineering', 'ENG', 'Marcus Vance'],
    ['Product & Design', 'DES', 'Elena Rostova'],
    ['IT & Infrastructure', 'IT', 'David Kim'],
    ['Human Resources', 'HR', 'Jessica Taylor'],
    ['Finance & Operations', 'FIN', 'Robert Sterling'],
    ['Sales & Marketing', 'MKT', 'Amanda Brooks']
  ];
  depts.forEach(d => insertDept.run(d[0], d[1], d[2]));

  const insertCat = db.prepare('INSERT INTO categories (name, code, useful_life_years, salvage_percentage, icon) VALUES (?, ?, ?, ?, ?)');
  const categories = [
    ['Laptops & Workstations', 'LAPTOP', 4, 15.0, 'laptop'],
    ['Displays & Monitors', 'DISPLAY', 5, 10.0, 'monitor'],
    ['Ergonomic Furniture', 'FURNITURE', 7, 5.0, 'armchair'],
    ['Mobile & Testing Devices', 'MOBILE', 3, 10.0, 'smartphone'],
    ['Networking & Servers', 'NETWORKING', 5, 8.0, 'server'],
    ['Audio & Video Conferencing', 'AV', 4, 10.0, 'video']
  ];
  categories.forEach(c => insertCat.run(c[0], c[1], c[2], c[3], c[4]));

  const insertLoc = db.prepare('INSERT INTO locations (building, floor, room, code) VALUES (?, ?, ?, ?)');
  const locations = [
    ['HQ Tower A', 'Floor 2', 'Engineering Pod Alpha', 'HQ-2-ENG'],
    ['HQ Tower A', 'Floor 2', 'Design Lab Studio', 'HQ-2-DES'],
    ['HQ Tower A', 'Floor 1', 'Main Server Room', 'HQ-1-SVR'],
    ['HQ Tower A', 'Floor 3', 'Executive Boardroom', 'HQ-3-EXEC'],
    ['HQ Tower A', 'Floor 1', 'IT Helpdesk & Logistics', 'HQ-1-IT']
  ];
  locations.forEach(l => insertLoc.run(l[0], l[1], l[2], l[3]));

  const insertEmp = db.prepare(`
    INSERT INTO employees (employee_id, full_name, email, department_id, designation, phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const employees = [
    ['EMP-1001', 'Sarah Chen', 'sarah.chen@company.com', 1, 'Principal Software Engineer', '+1 555-0101', 'Active'],
    ['EMP-1002', 'Alex Rivera', 'alex.rivera@company.com', 1, 'Full-Stack Developer', '+1 555-0102', 'Active'],
    ['EMP-1003', 'Elena Rostova', 'elena.rostova@company.com', 2, 'VP of Product Design', '+1 555-0103', 'Active'],
    ['EMP-1004', 'David Kim', 'david.kim@company.com', 3, 'Lead IT Systems Administrator', '+1 555-0104', 'Active'],
    ['EMP-1005', 'Jessica Taylor', 'jessica.taylor@company.com', 4, 'HR Director', '+1 555-0105', 'Active'],
    ['EMP-1006', 'Robert Sterling', 'robert.sterling@company.com', 5, 'Chief Financial Officer', '+1 555-0106', 'Active'],
    ['EMP-1007', 'Amanda Brooks', 'amanda.brooks@company.com', 6, 'Enterprise Sales Lead', '+1 555-0107', 'Active'],
    ['EMP-1008', 'Michael Zhang', 'michael.zhang@company.com', 1, 'QA Automation Engineer', '+1 555-0108', 'Active']
  ];
  employees.forEach(e => insertEmp.run(...e));

  const insertAsset = db.prepare(`
    INSERT INTO assets (
      asset_tag, serial_number, name, category_id, model, manufacturer,
      purchase_date, purchase_cost, salvage_value, useful_life_years,
      warranty_expiry, status, condition, location_id, assigned_to, specifications, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialAssets = [
    [
      'AST-2024-001', 'C02FX0A1MD6R', 'MacBook Pro 16" M3 Max', 1, 'M3 Max 36GB / 1TB', 'Apple Inc.',
      '2024-01-15', 3499.00, 500.00, 4, '2027-01-15', 'Assigned', 'Excellent', 1, 1,
      '16-core CPU, 40-core GPU, 36GB Unified RAM, 1TB NVMe', 'Assigned to Lead Architect'
    ],
    [
      'AST-2024-002', 'DELL-9530-8821', 'Dell XPS 15 9530 OLED', 1, 'XPS 15 9530', 'Dell',
      '2024-02-10', 2399.00, 300.00, 4, '2027-02-10', 'Assigned', 'Good', 1, 2,
      'Intel Core i9-13900H, 32GB DDR5, RTX 4070, 3.5K OLED Touch', 'Development workstation'
    ],
    [
      'AST-2024-003', 'TP-X1-2024-991', 'ThinkPad X1 Carbon Gen 11', 1, 'X1 Carbon Gen 11', 'Lenovo',
      '2024-03-01', 1899.00, 250.00, 4, '2027-03-01', 'Available', 'New', 5, null,
      'Intel Core i7-1365U vPro, 32GB RAM, 1TB SSD, 14" WUXGA', 'Ready in inventory for onboarding'
    ],
    [
      'AST-2024-004', 'HM-AER-99812', 'Herman Miller Aeron Chair', 3, 'Aeron Size B Carbon', 'Herman Miller',
      '2023-06-20', 1495.00, 200.00, 7, '2035-06-20', 'Assigned', 'Excellent', 2, 3,
      'PostureFit SL, Fully Adjustable Arms, Standard Tilt', 'Design Studio executive chair'
    ],
    [
      'AST-2024-005', 'LG-32UN880-441', 'LG UltraFine 32" Ergo 4K Monitor', 2, '32UN880-B', 'LG Electronics',
      '2024-01-20', 699.00, 70.00, 5, '2027-01-20', 'Assigned', 'Excellent', 1, 1,
      '32-inch 4K UHD (3840 x 2160) IPS, USB-C 60W PD, Ergonomic Arm', 'Paired with AST-2024-001'
    ],
    [
      'AST-2024-006', 'DELL-U2723QE-10', 'Dell UltraSharp 27" 4K USB-C Hub', 2, 'U2723QE', 'Dell',
      '2024-04-12', 579.00, 60.00, 5, '2027-04-12', 'Available', 'New', 5, null,
      'IPS Black Technology, 2000:1 Contrast, 90W Power Delivery', 'Spare high-res monitor'
    ],
    [
      'AST-2024-007', 'APL-IP15P-339', 'Apple iPhone 15 Pro Test Lab', 4, 'iPhone 15 Pro 256GB', 'Apple Inc.',
      '2023-10-05', 1099.00, 150.00, 3, '2026-10-05', 'Assigned', 'Good', 1, 8,
      'Natural Titanium, iOS 18 beta test device', 'Mobile testing suite'
    ],
    [
      'AST-2024-008', 'CSCO-9300-880', 'Cisco Catalyst 9300 48-Port Switch', 5, 'C9300-48P-A', 'Cisco Systems',
      '2023-04-01', 5200.00, 500.00, 5, '2028-04-01', 'In Maintenance', 'Fair', 3, null,
      '48 Ports PoE+, Network Advantage, 715W AC Power Supply', 'Under repair for uplink port 1 intermittency'
    ],
    [
      'AST-2024-009', 'SNY-WH5-5512', 'Sony WH-1000XM5 ANC Headset', 6, 'WH-1000XM5 Silver', 'Sony',
      '2024-02-18', 399.00, 40.00, 3, '2025-02-18', 'Assigned', 'Excellent', 2, 3,
      'Industry-leading noise cancelation, 30h battery life', 'Studio audio monitoring'
    ],
    [
      'AST-2024-010', 'BNQ-LK936ST-01', 'BenQ 4K HDR Conference Projector', 6, 'LK936ST 5100 ANSI', 'BenQ',
      '2023-08-14', 4499.00, 400.00, 5, '2026-08-14', 'Available', 'Good', 4, null,
      '5100 Lumens, 4K UHD, Short Throw, Laser light source', 'Installed in Boardroom 301'
    ],
    [
      'AST-2024-011', 'SC-GESTURE-77', 'Steelcase Gesture Ergonomic Chair', 3, 'Gesture Connect 3D', 'Steelcase',
      '2023-11-10', 1380.00, 150.00, 7, '2035-11-10', 'Available', 'New', 5, null,
      '360-degree rotating arms, Cogent: Connect fabric in Cobalt', 'Inventory ready for new executive hire'
    ],
    [
      'AST-2024-012', 'APL-IPAD-M2-04', 'iPad Pro 12.9" M2 Cellular', 4, 'iPad Pro 12.9 6th Gen', 'Apple Inc.',
      '2023-09-12', 1299.00, 150.00, 3, '2025-09-12', 'In Maintenance', 'Fair', 5, null,
      'Liquid Retina XDR, Apple M2 chip, 256GB + 5G', 'Sent for AppleCare display replacement'
    ]
  ];

  initialAssets.forEach(a => insertAsset.run(...a));

  // Seed Allocations
  const insertAlloc = db.prepare(`
    INSERT INTO allocations (asset_id, employee_id, allocated_date, expected_return_date, checkout_condition, status, checkout_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertAlloc.run(1, 1, '2024-01-16 09:30:00', '2025-01-16', 'Brand New Sealed', 'Active', 'Issued on joining date with accessories');
  insertAlloc.run(2, 2, '2024-02-11 11:00:00', '2025-02-11', 'Excellent', 'Active', 'Assigned for client project development');
  insertAlloc.run(4, 3, '2023-06-21 14:00:00', '2025-06-21', 'New', 'Active', 'Design studio ergonomic assignment');
  insertAlloc.run(5, 1, '2024-01-21 10:15:00', '2025-01-21', 'New in Box', 'Active', 'Dual monitor setup at workstation');
  insertAlloc.run(7, 8, '2023-10-06 15:00:00', '2025-04-06', 'Good', 'Active', 'QA device pool reservation');
  insertAlloc.run(9, 3, '2024-02-19 16:30:00', '2025-02-19', 'New', 'Active', 'Audio editing equipment');

  // Seed Maintenance records
  const insertMaint = db.prepare(`
    INSERT INTO maintenance_records (ticket_number, asset_id, issue_description, priority, status, reported_by, assigned_vendor, cost, reported_date, resolution_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMaint.run(
    'MNT-2024-001', 8, 'SFP+ Uplink port 1 dropping packets during peak server traffic',
    'Critical', 'In Progress', 'David Kim', 'Cisco SmartNet TAC', 450.00, '2024-05-10 08:30:00',
    'RMA unit in transit, temporary bypass cable rerouted.'
  );
  insertMaint.run(
    'MNT-2024-002', 12, 'Minor backlight bleed in bottom right corner of mini-LED panel',
    'Medium', 'In Progress', 'Michael Zhang', 'Apple Authorized Service Provider', 120.00, '2024-05-12 14:20:00',
    'Under AppleCare+ warranty coverage claim.'
  );
  insertMaint.run(
    'MNT-2024-003', 2, 'Routine dust cleaning and thermal paste refresh',
    'Low', 'Completed', 'Alex Rivera', 'Internal IT Dept', 0.00, '2024-04-01 10:00:00',
    'Fans cleaned, thermal temperatures decreased by 12 deg C.'
  );

  // Seed Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run('SYSTEM_INIT', 'system', 0, 'System Setup', 'Office Asset Management System initialized with enterprise seed dataset.', '2024-01-01 00:00:00');
  insertAudit.run('CREATE_ASSET', 'asset', 1, 'David Kim (IT Admin)', 'Registered MacBook Pro 16" M3 Max (AST-2024-001)', '2024-01-15 09:00:00');
  insertAudit.run('CHECKOUT_ASSET', 'allocation', 1, 'David Kim (IT Admin)', 'Assigned AST-2024-001 to Sarah Chen (Engineering)', '2024-01-16 09:30:00');
  insertAudit.run('MAINTENANCE_TICKET', 'maintenance', 1, 'David Kim (IT Admin)', 'Opened ticket MNT-2024-001 for Cisco Catalyst Switch 9300', '2024-05-10 08:30:00');

  console.log('Seed completed successfully! 12 assets, 8 employees, 6 allocations, 3 maintenance tickets.');
}

module.exports = { seedDatabase, seedUsers };
