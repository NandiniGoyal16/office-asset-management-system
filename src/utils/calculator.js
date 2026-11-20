/**
 * Asset Financial & Depreciation Calculator
 * Implements Standard Straight-Line Depreciation according to GAAP / IAS 16
 */

/**
 * Calculate straight-line depreciation for an individual asset
 * 
 * @param {Object} asset
 * @param {Date|string} [asOfDate]
 * @returns {Object} Calculated metrics
 */
function calculateAssetDepreciation(asset, asOfDate = new Date()) {
  const cost = parseFloat(asset.purchase_cost) || 0;
  const salvage = parseFloat(asset.salvage_value) || 0;
  const usefulYears = Math.max(1, parseInt(asset.useful_life_years, 10) || 4);
  const purchaseDate = new Date(asset.purchase_date);
  const targetDate = new Date(asOfDate);

  const depreciableAmount = Math.max(0, cost - salvage);
  const annualDepreciation = depreciableAmount / usefulYears;
  const dailyDepreciation = annualDepreciation / 365.25;

  const diffTime = Math.max(0, targetDate - purchaseDate);
  const daysInService = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const yearsInService = daysInService / 365.25;

  const accumulatedDepreciation = Math.min(
    depreciableAmount,
    Math.round(daysInService * dailyDepreciation * 100) / 100
  );

  const currentBookValue = Math.max(salvage, Math.round((cost - accumulatedDepreciation) * 100) / 100);
  const depreciationPercentage = depreciableAmount > 0 
    ? Math.min(100, Math.round((accumulatedDepreciation / depreciableAmount) * 1000) / 10)
    : 100;

  const remainingYears = Math.max(0, Math.round((usefulYears - yearsInService) * 10) / 10);
  const isFullyDepreciated = accumulatedDepreciation >= depreciableAmount;

  return {
    purchaseCost: cost,
    salvageValue: salvage,
    usefulLifeYears: usefulYears,
    daysInService,
    yearsInService: Math.round(yearsInService * 10) / 10,
    annualDepreciation: Math.round(annualDepreciation * 100) / 100,
    accumulatedDepreciation,
    currentBookValue,
    depreciationPercentage,
    remainingYears,
    isFullyDepreciated
  };
}

/**
 * Generate year-by-year depreciation schedule for financial reports
 * 
 * @param {Object} asset
 * @returns {Array<Object>} Year-by-year schedule
 */
function generateSchedule(asset) {
  const cost = parseFloat(asset.purchase_cost) || 0;
  const salvage = parseFloat(asset.salvage_value) || 0;
  const usefulYears = Math.max(1, parseInt(asset.useful_life_years, 10) || 4);
  const purchaseYear = new Date(asset.purchase_date).getFullYear();

  const depreciableAmount = Math.max(0, cost - salvage);
  const annualDep = depreciableAmount / usefulYears;

  const schedule = [];
  let openingVal = cost;
  let totalDep = 0;

  for (let year = 1; year <= usefulYears; year++) {
    const depThisYear = Math.min(annualDep, openingVal - salvage);
    totalDep += depThisYear;
    const endingVal = Math.max(salvage, cost - totalDep);

    schedule.push({
      yearIndex: year,
      calendarYear: purchaseYear + year - 1,
      openingValue: Math.round(openingVal * 100) / 100,
      depreciationExpense: Math.round(depThisYear * 100) / 100,
      accumulatedDepreciation: Math.round(totalDep * 100) / 100,
      endingBookValue: Math.round(endingVal * 100) / 100
    });

    openingVal = endingVal;
  }

  return schedule;
}

module.exports = {
  calculateAssetDepreciation,
  generateSchedule
};
