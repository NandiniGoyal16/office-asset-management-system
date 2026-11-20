const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../server');
const { calculateAssetDepreciation, generateSchedule } = require('../src/utils/calculator');

let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('1. Straight-Line Depreciation Financial Calculator', () => {
  test('Calculates annual depreciation and current book value accurately', () => {
    const mockAsset = {
      purchase_cost: 3000,
      salvage_value: 300,
      useful_life_years: 3,
      purchase_date: '2024-01-01'
    };

    const asOf = new Date('2025-01-01');
    const result = calculateAssetDepreciation(mockAsset, asOf);

    assert.strictEqual(result.purchaseCost, 3000);
    assert.strictEqual(result.salvageValue, 300);
    assert.strictEqual(result.usefulLifeYears, 3);
    assert.strictEqual(result.annualDepreciation, 900);
    assert.ok(result.currentBookValue <= 2105 && result.currentBookValue >= 2095, `Book value was ${result.currentBookValue}`);
    assert.strictEqual(result.isFullyDepreciated, false);
  });

  test('Depreciation does not drop below salvage value even past useful life', () => {
    const mockAsset = {
      purchase_cost: 1000,
      salvage_value: 100,
      useful_life_years: 2,
      purchase_date: '2015-01-01'
    };
    const asOf = new Date('2024-01-01');
    const result = calculateAssetDepreciation(mockAsset, asOf);

    assert.strictEqual(result.currentBookValue, 100);
    assert.strictEqual(result.accumulatedDepreciation, 900);
    assert.strictEqual(result.isFullyDepreciated, true);
    assert.strictEqual(result.depreciationPercentage, 100);
  });

  test('Generates complete multi-year schedule', () => {
    const mockAsset = {
      purchase_cost: 4000,
      salvage_value: 400,
      useful_life_years: 4,
      purchase_date: '2024-01-01'
    };
    const schedule = generateSchedule(mockAsset);
    assert.strictEqual(schedule.length, 4);
    assert.strictEqual(schedule[0].openingValue, 4000);
    assert.strictEqual(schedule[3].endingBookValue, 400);
  });
});

describe('2. Asset Lifecycle & Inventory API', () => {
  test('GET /api/reports/dashboard returns executive KPIs', async () => {
    const res = await fetch(`${baseUrl}/api/reports/dashboard`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.summary.totalAssets > 0);
    assert.ok(body.summary.totalPurchaseCost > 0);
    assert.ok(body.summary.totalCurrentBookValue > 0);
    assert.ok(body.categoryDistribution);
  });

  test('GET /api/assets lists assets with financials', async () => {
    const res = await fetch(`${baseUrl}/api/assets`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data[0].financials);
    assert.ok(body.data[0].financials.currentBookValue !== undefined);
  });

  test('GET /api/assets/:id returns QR code and details', async () => {
    const res = await fetch(`${baseUrl}/api/assets/1`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.qrCodeDataUrl.startsWith('data:image/png;base64,'));
    assert.ok(Array.isArray(body.data.allocations));
    assert.ok(Array.isArray(body.data.schedule));
  });

  test('GET /api/assets/:id/qr streams PNG QR code directly', async () => {
    const res = await fetch(`${baseUrl}/api/assets/1/qr`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/png');
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 100);
  });

  test('POST /api/assets registers a new asset into inventory', async () => {
    const newAsset = {
      name: 'Dell Precision 5680 Workstation',
      serial_number: `PREC-${Date.now()}`,
      category_id: 1,
      model: 'Precision 5680 i7 64GB',
      manufacturer: 'Dell',
      purchase_date: '2024-06-01',
      purchase_cost: 2850.00,
      salvage_value: 250.00,
      useful_life_years: 4,
      condition: 'New'
    };

    const res = await fetch(`${baseUrl}/api/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAsset)
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.id > 0);
    assert.ok(body.asset_tag.startsWith('AST-'));
  });
});

describe('3. Asset Allocation (Checkout & Checkin) Flow', () => {
  let createdAssetId;

  test('Checkout asset and return asset successfully', async () => {
    // 1. Create an available asset specifically for checkout test
    const aRes = await fetch(`${baseUrl}/api/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Logitech MX Master 3S Mouse',
        serial_number: `MX3-${Date.now()}`,
        category_id: 1,
        purchase_date: '2024-05-01',
        purchase_cost: 99.00
      })
    });
    const aBody = await aRes.json();
    createdAssetId = aBody.id;

    // 2. Checkout
    const res = await fetch(`${baseUrl}/api/allocations/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: createdAssetId,
        employee_id: 2, // Alex Rivera
        expected_return_date: '2025-05-01',
        checkout_notes: 'Ergonomic mouse assignment'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.allocationId > 0);

    // Verify asset status changed to Assigned
    const assetRes = await fetch(`${baseUrl}/api/assets/${createdAssetId}`);
    const assetData = await assetRes.json();
    assert.strictEqual(assetData.data.status, 'Assigned');
    assert.strictEqual(assetData.data.assigned_to, 2);

    // 3. Return / Checkin
    const returnRes = await fetch(`${baseUrl}/api/allocations/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocation_id: body.data.allocationId,
        return_condition: 'Excellent',
        return_notes: 'Returned in mint condition'
      })
    });
    assert.strictEqual(returnRes.status, 200);

    // Verify asset status reverted to Available
    const assetResAfter = await fetch(`${baseUrl}/api/assets/${createdAssetId}`);
    const assetDataAfter = await assetResAfter.json();
    assert.strictEqual(assetDataAfter.data.status, 'Available');
    assert.strictEqual(assetDataAfter.data.assigned_to, null);
  });
});

describe('4. Maintenance & Service Lifecycle', () => {
  test('POST /api/maintenance opens ticket and sets asset to In Maintenance, then completes', async () => {
    // 1. Create asset
    const aRes = await fetch(`${baseUrl}/api/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'HP LaserJet Enterprise Printer',
        serial_number: `HPLJ-${Date.now()}`,
        category_id: 1,
        purchase_date: '2023-01-01',
        purchase_cost: 850.00
      })
    });
    const aData = await aRes.json();
    const assetId = aData.id;

    // 2. Log ticket
    const mRes = await fetch(`${baseUrl}/api/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: assetId,
        issue_description: 'Paper jam in tray 2 and roller worn out',
        priority: 'High',
        assigned_vendor: 'HP Support'
      })
    });
    assert.strictEqual(mRes.status, 201);
    const mData = await mRes.json();
    assert.ok(mData.data.ticketNumber.startsWith('MNT-'));

    // Verify asset status is now In Maintenance
    const checkRes = await fetch(`${baseUrl}/api/assets/${assetId}`);
    const checkData = await checkRes.json();
    assert.strictEqual(checkData.data.status, 'In Maintenance');

    // 3. Resolve ticket
    const resolveRes = await fetch(`${baseUrl}/api/maintenance/${mData.data.ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Completed',
        resolution_notes: 'Roller assembly replaced. Tested 100 pages without error.',
        cost: 65.00,
        return_to_available: true
      })
    });
    assert.strictEqual(resolveRes.status, 200);

    // Verify asset returned to Available
    const resolvedCheck = await fetch(`${baseUrl}/api/assets/${assetId}`);
    const resolvedData = await resolvedCheck.json();
    assert.strictEqual(resolvedData.data.status, 'Available');
  });
});

describe('5. Reports & Audit Trail', () => {
  test('GET /api/reports/export-csv returns formatted CSV file', async () => {
    const res = await fetch(`${baseUrl}/api/reports/export-csv`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/csv'));
    const text = await res.text();
    assert.ok(text.includes('Asset Tag,Serial Number,Asset Name'));
  });

  test('GET /api/audit returns logged historical activities', async () => {
    const res = await fetch(`${baseUrl}/api/audit`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0);
  });
});
