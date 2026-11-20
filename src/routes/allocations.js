const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET /api/allocations - List all allocations (active and history)
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        al.*,
        a.asset_tag, a.name AS asset_name, a.model AS asset_model, a.serial_number,
        c.name AS category_name,
        e.employee_id AS emp_code, e.full_name AS employee_name, e.email AS employee_email,
        d.name AS department_name
      FROM allocations al
      JOIN assets a ON al.asset_id = a.id
      JOIN employees e ON al.employee_id = e.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND al.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY al.id DESC`;

    const records = db.prepare(query).all(...params);
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    console.error('Error fetching allocations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/allocations/checkout - Check out an asset to an employee
router.post('/checkout', (req, res) => {
  const { asset_id, employee_id, expected_return_date, checkout_condition, checkout_notes, allocated_by } = req.body;

  if (!asset_id || !employee_id) {
    return res.status(400).json({ success: false, error: 'Both asset_id and employee_id are required.' });
  }

  const transaction = db.transaction(() => {
    // Check asset availability
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(asset_id);
    if (!asset) {
      throw new Error('Asset does not exist.');
    }
    if (asset.status !== 'Available') {
      throw new Error(`Asset is currently ${asset.status} and cannot be checked out.`);
    }

    // Check employee
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
    if (!employee) {
      throw new Error('Employee does not exist.');
    }

    // Insert allocation record
    const insertStmt = db.prepare(`
      INSERT INTO allocations (
        asset_id, employee_id, allocated_date, expected_return_date,
        allocated_by, checkout_condition, status, checkout_notes
      ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, 'Active', ?)
    `);

    const allocResult = insertStmt.run(
      asset_id,
      employee_id,
      expected_return_date || null,
      allocated_by || 'IT Administrator',
      checkout_condition || asset.condition || 'Good',
      checkout_notes || ''
    );

    // Update asset status
    db.prepare(`
      UPDATE assets 
      SET status = 'Assigned', assigned_to = ?, condition = COALESCE(?, condition), updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(employee_id, checkout_condition, asset_id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'CHECKOUT',
      'allocation',
      allocResult.lastInsertRowid,
      allocated_by || 'IT Administrator',
      `Checked out ${asset.asset_tag} (${asset.name}) to ${employee.full_name} (${employee.employee_id})`
    );

    return {
      allocationId: allocResult.lastInsertRowid,
      assetTag: asset.asset_tag,
      employeeName: employee.full_name
    };
  });

  try {
    const result = transaction();
    res.status(201).json({
      success: true,
      message: `Asset ${result.assetTag} successfully assigned to ${result.employeeName}.`,
      data: result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/allocations/checkin - Check in / Return an asset
router.post('/checkin', (req, res) => {
  const { allocation_id, return_condition, return_notes, performed_by } = req.body;

  if (!allocation_id) {
    return res.status(400).json({ success: false, error: 'Allocation ID is required.' });
  }

  const transaction = db.transaction(() => {
    const allocation = db.prepare(`
      SELECT al.*, a.asset_tag, a.name AS asset_name, e.full_name AS employee_name
      FROM allocations al
      JOIN assets a ON al.asset_id = a.id
      JOIN employees e ON al.employee_id = e.id
      WHERE al.id = ?
    `).get(allocation_id);

    if (!allocation) {
      throw new Error('Allocation record not found.');
    }
    if (allocation.status === 'Returned') {
      throw new Error('Asset has already been returned.');
    }

    // Update allocation record
    db.prepare(`
      UPDATE allocations SET
        status = 'Returned',
        returned_date = CURRENT_TIMESTAMP,
        return_condition = ?,
        return_notes = ?
      WHERE id = ?
    `).run(return_condition || 'Good', return_notes || '', allocation_id);

    // Update asset back to Available
    db.prepare(`
      UPDATE assets SET
        status = 'Available',
        assigned_to = NULL,
        condition = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(return_condition || 'Good', allocation.asset_id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'CHECKIN',
      'allocation',
      allocation_id,
      performed_by || 'IT Administrator',
      `Checked in ${allocation.asset_tag} from ${allocation.employee_name}. Condition: ${return_condition || 'Good'}`
    );

    return {
      assetTag: allocation.asset_tag,
      employeeName: allocation.employee_name
    };
  });

  try {
    const result = transaction();
    res.json({
      success: true,
      message: `Asset ${result.assetTag} returned to inventory successfully.`,
      data: result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
