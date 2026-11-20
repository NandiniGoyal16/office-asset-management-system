const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET /api/maintenance - List all maintenance tickets
router.get('/', (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = `
      SELECT 
        m.*,
        a.asset_tag, a.name AS asset_name, a.model AS asset_model, a.status AS asset_status,
        c.name AS category_name,
        l.building, l.floor, l.room
      FROM maintenance_records m
      JOIN assets a ON m.asset_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND m.status = ?`;
      params.push(status);
    }
    if (priority && priority !== 'ALL') {
      query += ` AND m.priority = ?`;
      params.push(priority);
    }

    query += ` ORDER BY m.id DESC`;

    const records = db.prepare(query).all(...params);
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    console.error('Error fetching maintenance:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/maintenance - Create new maintenance ticket
router.post('/', (req, res) => {
  const { asset_id, issue_description, priority, reported_by, assigned_vendor, cost } = req.body;

  if (!asset_id || !issue_description) {
    return res.status(400).json({ success: false, error: 'Asset ID and issue description are required.' });
  }

  const transaction = db.transaction(() => {
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(asset_id);
    if (!asset) {
      throw new Error('Asset not found.');
    }

    const year = new Date().getFullYear();
    const countRow = db.prepare('SELECT COUNT(*) as count FROM maintenance_records').get();
    const ticket_number = `MNT-${year}-${String(countRow.count + 1).padStart(3, '0')}`;

    const stmt = db.prepare(`
      INSERT INTO maintenance_records (
        ticket_number, asset_id, issue_description, priority, status,
        reported_by, assigned_vendor, cost, reported_date
      ) VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      ticket_number,
      asset_id,
      issue_description,
      priority || 'Medium',
      reported_by || 'Staff Member',
      assigned_vendor || 'Internal IT',
      cost ? parseFloat(cost) : 0.0
    );

    // If ticket is created, update asset status to In Maintenance
    db.prepare(`
      UPDATE assets SET status = 'In Maintenance', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(asset_id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'MAINTENANCE_TICKET',
      'maintenance',
      result.lastInsertRowid,
      reported_by || 'Staff',
      `Opened ticket ${ticket_number} for ${asset.asset_tag} (${asset.name}): ${issue_description}`
    );

    return {
      ticketNumber: ticket_number,
      ticketId: result.lastInsertRowid,
      assetTag: asset.asset_tag
    };
  });

  try {
    const result = transaction();
    res.status(201).json({
      success: true,
      message: `Maintenance ticket ${result.ticketNumber} created.`,
      data: result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/maintenance/:id - Update ticket (e.g. resolve / complete)
router.put('/:id', (req, res) => {
  const ticketId = req.params.id;
  const { status, resolution_notes, cost, return_to_available } = req.body;

  const transaction = db.transaction(() => {
    const ticket = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(ticketId);
    if (!ticket) {
      throw new Error('Maintenance ticket not found.');
    }

    const isCompleting = status === 'Completed' || status === 'Cancelled';
    const completedDate = isCompleting ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE maintenance_records SET
        status = COALESCE(?, status),
        resolution_notes = COALESCE(?, resolution_notes),
        cost = COALESCE(?, cost),
        completed_date = COALESCE(?, completed_date)
      WHERE id = ?
    `).run(
      status,
      resolution_notes,
      cost !== undefined ? parseFloat(cost) : null,
      completedDate,
      ticketId
    );

    // If ticket is completed, return asset to Available status if requested
    if (status === 'Completed' && (return_to_available !== false)) {
      db.prepare(`
        UPDATE assets SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(ticket.asset_id);
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'MAINTENANCE_UPDATE',
      'maintenance',
      ticketId,
      'Technician',
      `Updated ticket ${ticket.ticket_number} to ${status || ticket.status}. Notes: ${resolution_notes || 'None'}`
    );

    return ticket.ticket_number;
  });

  try {
    const ticketNumber = transaction();
    res.json({
      success: true,
      message: `Ticket ${ticketNumber} updated successfully.`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
