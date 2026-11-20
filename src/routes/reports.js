const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { calculateAssetDepreciation } = require('../utils/calculator');

// GET /api/reports/dashboard - Master Dashboard Analytics & KPIs
router.get('/dashboard', (req, res) => {
  try {
    const assets = db.prepare(`
      SELECT a.*, c.name AS category_name, d.name AS department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN employees e ON a.assigned_to = e.id
      LEFT JOIN departments d ON e.department_id = d.id
    `).all();

    let totalPurchaseCost = 0;
    let totalCurrentBookValue = 0;
    let totalAccumulatedDepreciation = 0;

    let availableCount = 0;
    let assignedCount = 0;
    let maintenanceCount = 0;
    let decommissionedCount = 0;

    const categoryMap = {};
    const departmentMap = {};

    const now = new Date();
    const ninetyDaysAhead = new Date();
    ninetyDaysAhead.setDate(now.getDate() + 90);

    const expiringWarranties = [];

    assets.forEach(asset => {
      const dep = calculateAssetDepreciation(asset, now);
      totalPurchaseCost += dep.purchaseCost;
      totalCurrentBookValue += dep.currentBookValue;
      totalAccumulatedDepreciation += dep.accumulatedDepreciation;

      if (asset.status === 'Available') availableCount++;
      else if (asset.status === 'Assigned') assignedCount++;
      else if (asset.status === 'In Maintenance') maintenanceCount++;
      else if (asset.status === 'Decommissioned') decommissionedCount++;

      // Category breakdown
      const cat = asset.category_name || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;

      // Department breakdown
      const dept = asset.department_name || 'Unassigned / Inventory';
      departmentMap[dept] = (departmentMap[dept] || 0) + 1;

      // Warranty check
      if (asset.warranty_expiry) {
        const wDate = new Date(asset.warranty_expiry);
        if (wDate >= now && wDate <= ninetyDaysAhead) {
          expiringWarranties.push({
            id: asset.id,
            asset_tag: asset.asset_tag,
            name: asset.name,
            warranty_expiry: asset.warranty_expiry,
            daysLeft: Math.ceil((wDate - now) / (1000 * 60 * 60 * 24))
          });
        }
      }
    });

    const activeTickets = db.prepare(`
      SELECT COUNT(*) as count FROM maintenance_records WHERE status IN ('Pending', 'In Progress')
    `).get().count;

    const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;

    // Recent activity
    const recentActivity = db.prepare(`
      SELECT * FROM audit_logs ORDER BY id DESC LIMIT 8
    `).all();

    res.json({
      success: true,
      summary: {
        totalAssets: assets.length,
        totalPurchaseCost: Math.round(totalPurchaseCost * 100) / 100,
        totalCurrentBookValue: Math.round(totalCurrentBookValue * 100) / 100,
        totalDepreciation: Math.round(totalAccumulatedDepreciation * 100) / 100,
        availableCount,
        assignedCount,
        maintenanceCount,
        decommissionedCount,
        activeTickets,
        totalEmployees,
        expiringWarrantiesCount: expiringWarranties.length
      },
      categoryDistribution: categoryMap,
      departmentDistribution: departmentMap,
      expiringWarranties,
      recentActivity
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/depreciation - Full Depreciation Schedule for all assets
router.get('/depreciation', (req, res) => {
  try {
    const assets = db.prepare(`
      SELECT a.*, c.name AS category_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      ORDER BY a.purchase_date ASC
    `).all();

    const report = assets.map(asset => {
      const dep = calculateAssetDepreciation(asset);
      return {
        id: asset.id,
        asset_tag: asset.asset_tag,
        name: asset.name,
        category: asset.category_name,
        purchase_date: asset.purchase_date,
        purchase_cost: dep.purchaseCost,
        salvage_value: dep.salvageValue,
        useful_life_years: dep.usefulLifeYears,
        annual_depreciation: dep.annualDepreciation,
        accumulated_depreciation: dep.accumulatedDepreciation,
        current_book_value: dep.currentBookValue,
        depreciation_percentage: dep.depreciationPercentage,
        remaining_years: dep.remainingYears,
        is_fully_depreciated: dep.isFullyDepreciated
      };
    });

    res.json({ success: true, count: report.length, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/export-csv - Generate clean CSV export
router.get('/export-csv', (req, res) => {
  try {
    const assets = db.prepare(`
      SELECT 
        a.asset_tag, a.serial_number, a.name, a.model, a.manufacturer,
        c.name AS category,
        a.purchase_date, a.purchase_cost, a.salvage_value, a.useful_life_years,
        a.warranty_expiry, a.status, a.condition,
        e.full_name AS assigned_to, d.name AS department,
        l.building || ' - ' || l.floor || ' (' || l.room || ')' AS location
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN employees e ON a.assigned_to = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN locations l ON a.location_id = l.id
      ORDER BY a.id ASC
    `).all();

    // CSV header
    const headers = [
      'Asset Tag', 'Serial Number', 'Asset Name', 'Model', 'Manufacturer',
      'Category', 'Purchase Date', 'Purchase Cost ($)', 'Current Book Value ($)',
      'Accumulated Depreciation ($)', 'Warranty Expiry', 'Status', 'Condition',
      'Assigned Employee', 'Department', 'Physical Location'
    ];

    const rows = assets.map(a => {
      const dep = calculateAssetDepreciation(a);
      return [
        `"${a.asset_tag}"`,
        `"${a.serial_number}"`,
        `"${(a.name || '').replace(/"/g, '""')}"`,
        `"${(a.model || '').replace(/"/g, '""')}"`,
        `"${(a.manufacturer || '').replace(/"/g, '""')}"`,
        `"${a.category || ''}"`,
        `"${a.purchase_date}"`,
        dep.purchaseCost.toFixed(2),
        dep.currentBookValue.toFixed(2),
        dep.accumulatedDepreciation.toFixed(2),
        `"${a.warranty_expiry || 'N/A'}"`,
        `"${a.status}"`,
        `"${a.condition}"`,
        `"${(a.assigned_to || 'None').replace(/"/g, '""')}"`,
        `"${(a.department || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(a.location || 'N/A').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Office_Asset_Register.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
