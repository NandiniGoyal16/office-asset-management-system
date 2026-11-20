const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { db } = require('../db/database');
const { calculateAssetDepreciation, generateSchedule } = require('../utils/calculator');

// GET /api/assets - List assets with filters & search
router.get('/', (req, res) => {
  try {
    const { status, category_id, department_id, search } = req.query;

    let query = `
      SELECT 
        a.*, 
        c.name AS category_name, c.icon AS category_icon,
        l.building, l.floor, l.room, l.code AS location_code,
        e.full_name AS assigned_employee_name, e.employee_id AS assigned_employee_id,
        d.name AS department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN employees e ON a.assigned_to = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (category_id && category_id !== 'ALL') {
      query += ` AND a.category_id = ?`;
      params.push(Number(category_id));
    }

    if (department_id && department_id !== 'ALL') {
      query += ` AND e.department_id = ?`;
      params.push(Number(department_id));
    }

    if (search && search.trim() !== '') {
      query += ` AND (
        a.asset_tag LIKE ? OR 
        a.serial_number LIKE ? OR 
        a.name LIKE ? OR 
        a.model LIKE ? OR 
        a.manufacturer LIKE ? OR 
        e.full_name LIKE ?
      )`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term);
    }

    query += ` ORDER BY a.id DESC`;

    const assets = db.prepare(query).all(...params);

    // Augment assets with live financial calculations
    const enrichedAssets = assets.map(asset => {
      const dep = calculateAssetDepreciation(asset);
      return {
        ...asset,
        financials: dep
      };
    });

    res.json({
      success: true,
      count: enrichedAssets.length,
      data: enrichedAssets
    });
  } catch (err) {
    console.error('Error fetching assets:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/assets/:id - Asset details with full history & QR
router.get('/:id', async (req, res) => {
  try {
    const assetId = req.params.id;
    const asset = db.prepare(`
      SELECT 
        a.*, 
        c.name AS category_name, c.icon AS category_icon, c.useful_life_years AS category_useful_life,
        l.building, l.floor, l.room, l.code AS location_code,
        e.full_name AS assigned_employee_name, e.employee_id AS assigned_employee_id, e.email AS assigned_employee_email,
        d.name AS department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN employees e ON a.assigned_to = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.id = ?
    `).get(assetId);

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    // Allocation history
    const allocations = db.prepare(`
      SELECT al.*, emp.full_name AS employee_name, emp.employee_id AS emp_code, dept.name AS department_name
      FROM allocations al
      JOIN employees emp ON al.employee_id = emp.id
      LEFT JOIN departments dept ON emp.department_id = dept.id
      WHERE al.asset_id = ?
      ORDER BY al.id DESC
    `).all(assetId);

    // Maintenance history
    const maintenance = db.prepare(`
      SELECT * FROM maintenance_records
      WHERE asset_id = ?
      ORDER BY id DESC
    `).all(assetId);

    // Financial calculations and yearly schedule
    const financials = calculateAssetDepreciation(asset);
    const schedule = generateSchedule(asset);

    // Generate dynamic QR Code (Base64 data URL)
    const qrPayload = JSON.stringify({
      tag: asset.asset_tag,
      serial: asset.serial_number,
      name: asset.name,
      model: asset.model,
      status: asset.status,
      assignedTo: asset.assigned_employee_name || 'In Stock',
      systemUrl: `/assets/${asset.id}`
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 256,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      data: {
        ...asset,
        financials,
        schedule,
        allocations,
        maintenance,
        qrCodeDataUrl
      }
    });
  } catch (err) {
    console.error('Error fetching asset detail:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/assets/:id/qr - Direct PNG Image Stream for QR Code Tag
router.get('/:id/qr', async (req, res) => {
  try {
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    if (!asset) {
      return res.status(404).send('Asset not found');
    }

    const qrPayload = JSON.stringify({
      tag: asset.asset_tag,
      serial: asset.serial_number,
      name: asset.name,
      status: asset.status
    });

    res.setHeader('Content-Type', 'image/png');
    QRCode.toFileStream(res, qrPayload, {
      width: 256,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    });
  } catch (err) {
    res.status(500).send('Error generating QR image');
  }
});

// POST /api/assets - Create new asset
router.post('/', (req, res) => {
  try {
    const {
      name,
      category_id,
      serial_number,
      model,
      manufacturer,
      purchase_date,
      purchase_cost,
      salvage_value,
      useful_life_years,
      warranty_expiry,
      condition,
      location_id,
      specifications,
      notes
    } = req.body;

    if (!name || !purchase_cost || !purchase_date) {
      return res.status(400).json({ success: false, error: 'Name, purchase cost, and purchase date are required.' });
    }

    // Auto-generate tag if not provided or empty
    let asset_tag = req.body.asset_tag;
    if (!asset_tag || asset_tag.trim() === '') {
      const year = new Date().getFullYear();
      const countRow = db.prepare('SELECT COUNT(*) as count FROM assets').get();
      const nextSeq = String(countRow.count + 1).padStart(3, '0');
      asset_tag = `AST-${year}-${nextSeq}`;
    }

    // Auto-generate serial number if empty
    const finalSerial = serial_number && serial_number.trim() !== '' 
      ? serial_number.trim() 
      : `SN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;

    const stmt = db.prepare(`
      INSERT INTO assets (
        asset_tag, serial_number, name, category_id, model, manufacturer,
        purchase_date, purchase_cost, salvage_value, useful_life_years,
        warranty_expiry, status, condition, location_id, assigned_to, specifications, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, NULL, ?, ?)
    `);

    const result = stmt.run(
      asset_tag,
      finalSerial,
      name.trim(),
      category_id ? Number(category_id) : 1,
      model || '',
      manufacturer || '',
      purchase_date,
      parseFloat(purchase_cost),
      salvage_value ? parseFloat(salvage_value) : 0,
      useful_life_years ? parseInt(useful_life_years, 10) : 4,
      warranty_expiry || null,
      condition || 'New',
      location_id ? Number(location_id) : 1,
      specifications || '',
      notes || ''
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'CREATE_ASSET',
      'asset',
      result.lastInsertRowid,
      'System Admin',
      `Registered asset: ${name} (${asset_tag}) with cost $${purchase_cost}`
    );

    res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      asset_tag,
      message: 'Asset successfully registered into inventory.'
    });
  } catch (err) {
    console.error('Error creating asset:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/assets/:id - Update asset
router.put('/:id', (req, res) => {
  try {
    const assetId = req.params.id;
    const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    const {
      name,
      category_id,
      model,
      manufacturer,
      purchase_date,
      purchase_cost,
      salvage_value,
      useful_life_years,
      warranty_expiry,
      condition,
      location_id,
      specifications,
      notes
    } = req.body;

    const stmt = db.prepare(`
      UPDATE assets SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        model = COALESCE(?, model),
        manufacturer = COALESCE(?, manufacturer),
        purchase_date = COALESCE(?, purchase_date),
        purchase_cost = COALESCE(?, purchase_cost),
        salvage_value = COALESCE(?, salvage_value),
        useful_life_years = COALESCE(?, useful_life_years),
        warranty_expiry = COALESCE(?, warranty_expiry),
        condition = COALESCE(?, condition),
        location_id = COALESCE(?, location_id),
        specifications = COALESCE(?, specifications),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      name,
      category_id ? Number(category_id) : null,
      model,
      manufacturer,
      purchase_date,
      purchase_cost ? parseFloat(purchase_cost) : null,
      salvage_value !== undefined ? parseFloat(salvage_value) : null,
      useful_life_years ? parseInt(useful_life_years, 10) : null,
      warranty_expiry,
      condition,
      location_id ? Number(location_id) : null,
      specifications,
      notes,
      assetId
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('UPDATE_ASSET', 'asset', assetId, 'System Admin', `Updated asset properties for ${existing.asset_tag}`);

    res.json({ success: true, message: 'Asset details updated successfully.' });
  } catch (err) {
    console.error('Error updating asset:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/assets/:id - Remove or decommission asset
router.delete('/:id', (req, res) => {
  try {
    const assetId = req.params.id;
    const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    if (existing.status === 'Assigned') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete an asset that is currently assigned to an employee. Return the asset first.'
      });
    }

    db.prepare('DELETE FROM assets WHERE id = ?').run(assetId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('DELETE_ASSET', 'asset', assetId, 'System Admin', `Deleted asset ${existing.asset_tag} (${existing.name})`);

    res.json({ success: true, message: 'Asset removed successfully.' });
  } catch (err) {
    console.error('Error deleting asset:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
