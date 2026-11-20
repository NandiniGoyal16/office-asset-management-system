const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET /api/employees - List all employees with assigned asset count
router.get('/', (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT 
        e.*,
        d.name AS department_name, d.code AS department_code,
        COUNT(a.id) AS assigned_asset_count
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN assets a ON a.assigned_to = e.id AND a.status = 'Assigned'
      GROUP BY e.id
      ORDER BY e.full_name ASC
    `).all();

    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/employees - Create employee
router.post('/', (req, res) => {
  try {
    const { employee_id, full_name, email, department_id, designation, phone } = req.body;
    if (!full_name || !email) {
      return res.status(400).json({ success: false, error: 'Full name and email are required.' });
    }

    let code = employee_id;
    if (!code || code.trim() === '') {
      const countRow = db.prepare('SELECT COUNT(*) as count FROM employees').get();
      code = `EMP-${1000 + countRow.count + 1}`;
    }

    const stmt = db.prepare(`
      INSERT INTO employees (employee_id, full_name, email, department_id, designation, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      code.trim(),
      full_name.trim(),
      email.trim().toLowerCase(),
      department_id ? Number(department_id) : 1,
      designation || '',
      phone || ''
    );

    res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      employee_id: code,
      message: 'Employee added successfully.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Dropdown Helper Routes
router.get('/meta/departments', (req, res) => {
  const data = db.prepare('SELECT * FROM departments ORDER BY name ASC').all();
  res.json({ success: true, data });
});

router.get('/meta/categories', (req, res) => {
  const data = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  res.json({ success: true, data });
});

router.get('/meta/locations', (req, res) => {
  const data = db.prepare('SELECT * FROM locations ORDER BY building, floor ASC').all();
  res.json({ success: true, data });
});

module.exports = router;
