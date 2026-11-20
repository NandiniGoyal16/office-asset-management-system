const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET /api/audit - List audit trail logs
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const logs = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
