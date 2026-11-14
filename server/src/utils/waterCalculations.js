/**
 * Water Conservation Calculation Engines and Scientific Estimation Models
 * JalGyan — Module C: Water Conservation Calculator
 *
 * Provides reproducible, transparent calculations for:
 * 1. Agriculture Water Requirements & Method Comparisons
 * 2. Drip Irrigation Conversion & Savings
 * 3. Rainwater Harvesting Potential
 * 4. Household Water Consumption & Efficiency Measures
 *
 * Note: Calculations use transparent, documented empirical assumptions
 * and are clearly identified as planning estimates.
 */

// ── Crop Water Requirements (Average Depth in mm per cropping season) ────────
export const CROP_WATER_SPECS = {
  RICE_PADDY: {
    label: 'Rice / Paddy',
    waterDepthMm: 1200,
    durationDays: 120,
    seasonsPerYear: 2,
    description: 'High water requirement crop typically grown under flooded conditions.',
  },
  WHEAT: {
    label: 'Wheat',
    waterDepthMm: 450,
    durationDays: 120,
    seasonsPerYear: 1,
    description: 'Rabi staple crop requiring moderate irrigation intervals.',
  },
  SUGARCANE: {
    label: 'Sugarcane',
    waterDepthMm: 1800,
    durationDays: 360,
    seasonsPerYear: 1,
    description: 'Long-duration perennial crop with substantial cumulative water need.',
  },
  COTTON: {
    label: 'Cotton',
    waterDepthMm: 700,
    durationDays: 150,
    seasonsPerYear: 1,
    description: 'Kharif cash crop highly responsive to precision irrigation.',
  },
  MAIZE: {
    label: 'Maize / Corn',
    waterDepthMm: 500,
    durationDays: 100,
    seasonsPerYear: 2,
    description: 'Cereal crop with critical water requirements during tasseling.',
  },
  PULSES: {
    label: 'Pulses / Legumes',
    waterDepthMm: 350,
    durationDays: 90,
    seasonsPerYear: 2,
    description: 'Low water requirement, drought-resilient soil-nourishing crops.',
  },
  VEGETABLES: {
    label: 'Vegetables (Mixed)',
    waterDepthMm: 450,
    durationDays: 85,
    seasonsPerYear: 3,
    description: 'Frequent shallow irrigation cycles across short growing periods.',
  },
  MILLETS: {
    label: 'Millets (Bajra / Jowar / Ragi)',
    waterDepthMm: 300,
    durationDays: 90,
    seasonsPerYear: 2,
    description: 'Nutri-cereals with very low water footprint and high heat tolerance.',
  },
  OTHER: {
    label: 'Custom / Other Crop',
    waterDepthMm: 500,
    durationDays: 100,
    seasonsPerYear: 1,
    description: 'Configurable crop baseline profile.',
  },
};

// ── Irrigation Method Efficiencies ───────────────────────────────────────────
export const IRRIGATION_EFFICIENCIES = {
  FLOOD: {
    label: 'Traditional Surface / Flood',
    efficiency: 0.45, // 45% of water applied reaches the crop root zone
    description: 'Traditional furrow or basin flooding with high evaporation and conveyance losses.',
  },
  SPRINKLER: {
    label: 'Sprinkler System',
    efficiency: 0.75, // 75% efficiency
    description: 'Pressurized overhead spray delivery with uniform ground distribution.',
  },
  DRIP: {
    label: 'Micro / Drip Irrigation',
    efficiency: 0.90, // 90% efficiency
    description: 'Direct root-zone micro-emitters minimizing evaporation and runoff losses.',
  },
};

// ── Unit Conversions ────────────────────────────────────────────────────────
// 1 acre = 4,046.86 m²
// 1 hectare = 10,000 m²
// 1 mm of water over 1 m² = 1 Litre
export const SQ_METERS_PER_ACRE = 4046.86;
export const SQ_METERS_PER_HECTARE = 10000;

/**
 * Validate that a number is finite, non-negative, and within reasonable range
 */
export function validateNumber(value, name, min = 0, max = 1e9) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Field '${name}' is required.`);
  }
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error(`Field '${name}' must be a valid finite number.`);
  }
  if (num < min) {
    throw new Error(`Field '${name}' must be greater than or equal to ${min}.`);
  }
  if (num > max) {
    throw new Error(`Field '${name}' exceeds maximum permissible value (${max}).`);
  }
  return num;
}

/**
 * 1. Agriculture Water Requirement Calculator
 */
export function calculateAgricultureWater(params = {}) {
  const area = validateNumber(params.area, 'area', 0.01, 100000);
  const unit = String(params.unit || 'ACRES').toUpperCase();
  if (!['ACRES', 'HECTARES'].includes(unit)) {
    throw new Error("Unit must be either 'ACRES' or 'HECTARES'.");
  }

  const cropKey = String(params.cropType || 'WHEAT').toUpperCase();
  const cropSpec = CROP_WATER_SPECS[cropKey] || CROP_WATER_SPECS.OTHER;
  const customWaterDepth = params.customWaterDepth
    ? validateNumber(params.customWaterDepth, 'customWaterDepth', 50, 4000)
    : null;

  const waterDepthMm = customWaterDepth || cropSpec.waterDepthMm;
  const durationDays = cropSpec.durationDays;

  const methodKey = String(params.irrigationMethod || 'FLOOD').toUpperCase();
  const methodSpec = IRRIGATION_EFFICIENCIES[methodKey] || IRRIGATION_EFFICIENCIES.FLOOD;
  const methodEfficiency = methodSpec.efficiency;

  // Convert area to square metres
  const areaSqM = unit === 'ACRES' ? area * SQ_METERS_PER_ACRE : area * SQ_METERS_PER_HECTARE;

  // Net crop water need (litres) = Area (m²) × Depth (mm) × 1 L/mm/m²
  const netCropWaterLiters = areaSqM * waterDepthMm;

  // Gross water application required (accounting for efficiency)
  const grossWaterLiters = netCropWaterLiters / methodEfficiency;
  const dailyRequirementLiters = grossWaterLiters / durationDays;

  // Potential savings if currently using Flood and upgrading to Drip or Sprinkler
  const floodGrossLiters = netCropWaterLiters / IRRIGATION_EFFICIENCIES.FLOOD.efficiency;
  const dripGrossLiters = netCropWaterLiters / IRRIGATION_EFFICIENCIES.DRIP.efficiency;
  const sprinklerGrossLiters = netCropWaterLiters / IRRIGATION_EFFICIENCIES.SPRINKLER.efficiency;

  let waterSavedLiters = 0;
  if (methodKey === 'DRIP') {
    waterSavedLiters = Math.max(0, floodGrossLiters - grossWaterLiters);
  } else if (methodKey === 'SPRINKLER') {
    waterSavedLiters = Math.max(0, floodGrossLiters - grossWaterLiters);
  }

  const potentialDripSavingsLiters = Math.max(0, floodGrossLiters - dripGrossLiters);
  const potentialSprinklerSavingsLiters = Math.max(0, floodGrossLiters - sprinklerGrossLiters);

  // Annualized derivation if seasons per year is provided
  const seasonsPerYear = params.seasonsPerYear
    ? validateNumber(params.seasonsPerYear, 'seasonsPerYear', 1, 3)
    : cropSpec.seasonsPerYear || 1;

  const annualGrossWaterLiters = grossWaterLiters * seasonsPerYear;
  const annualWaterSavedLiters = waterSavedLiters * seasonsPerYear;

  return {
    calculationType: 'AGRICULTURE',
    period: 'SEASONAL',
    inputParams: {
      area,
      unit,
      cropType: cropKey,
      cropLabel: cropSpec.label,
      irrigationMethod: methodKey,
      waterDepthMm,
      durationDays,
      seasonsPerYear,
    },
    resultMetrics: {
      areaSqM: Math.round(areaSqM),
      waterDepthMm,
      durationDays,
      netCropWaterLiters: Math.round(netCropWaterLiters),
      grossWaterRequirementLiters: Math.round(grossWaterLiters),
      dailyRequirementLiters: Math.round(dailyRequirementLiters),
      seasonalRequirementLiters: Math.round(grossWaterLiters),
      annualGrossWaterLiters: Math.round(annualGrossWaterLiters),
      waterSavedLiters: Math.round(waterSavedLiters),
      potentialDripSavingsLiters: Math.round(potentialDripSavingsLiters),
      potentialSprinklerSavingsLiters: Math.round(potentialSprinklerSavingsLiters),
      dripSavingsPercent: Math.round((potentialDripSavingsLiters / floodGrossLiters) * 100),
      sprinklerSavingsPercent: Math.round((potentialSprinklerSavingsLiters / floodGrossLiters) * 100),
      assumptionsDisclosed: {
        methodEfficiencyPercent: Math.round(methodEfficiency * 100),
        cropWaterDepthMm: waterDepthMm,
        cropDurationDays: durationDays,
        note: 'Estimates based on standard regional crop-water guidelines. Actual requirements vary with soil, weather, and topography.',
      },
    },
    waterSavedLiters: Math.round(waterSavedLiters),
    waterHarvestedLiters: 0,
    annualWaterSavedLiters: Math.round(annualWaterSavedLiters),
    annualWaterHarvestedLiters: null,
  };
}

/**
 * 2. Drip Irrigation Savings Calculator
 */
export function calculateDripIrrigation(params = {}) {
  const area = validateNumber(params.area, 'area', 0.01, 100000);
  const unit = String(params.unit || 'ACRES').toUpperCase();
  if (!['ACRES', 'HECTARES'].includes(unit)) {
    throw new Error("Unit must be either 'ACRES' or 'HECTARES'.");
  }

  const currentMethodKey = String(params.currentMethod || 'FLOOD').toUpperCase();
  const currentMethod = IRRIGATION_EFFICIENCIES[currentMethodKey] || IRRIGATION_EFFICIENCIES.FLOOD;

  // Drip efficiency can be configurable or standard 90%
  const dripEfficiency = params.dripEfficiency
    ? validateNumber(params.dripEfficiency, 'dripEfficiency', 50, 98) / 100
    : IRRIGATION_EFFICIENCIES.DRIP.efficiency;

  // Baseline water can be supplied directly or calculated using reference depth
  let currentWaterUsageLiters = 0;
  const areaSqM = unit === 'ACRES' ? area * SQ_METERS_PER_ACRE : area * SQ_METERS_PER_HECTARE;

  if (params.currentWaterUsageLiters) {
    currentWaterUsageLiters = validateNumber(
      params.currentWaterUsageLiters,
      'currentWaterUsageLiters',
      1,
      1e12
    );
  } else {
    // Reference crop depth (default 600mm if not specified)
    const referenceDepthMm = params.waterDepthMm
      ? validateNumber(params.waterDepthMm, 'waterDepthMm', 50, 3000)
      : 600;
    const netWaterLiters = areaSqM * referenceDepthMm;
    currentWaterUsageLiters = netWaterLiters / currentMethod.efficiency;
  }

  // Drip consumption: the net water delivered is same, but with drip's higher efficiency
  const netCropNeedLiters = currentWaterUsageLiters * currentMethod.efficiency;
  const dripWaterUsageLiters = netCropNeedLiters / dripEfficiency;

  const waterSavedLiters = Math.max(0, currentWaterUsageLiters - dripWaterUsageLiters);
  const savingsPercent =
    currentWaterUsageLiters > 0
      ? Math.min(100, Math.max(0, (waterSavedLiters / currentWaterUsageLiters) * 100))
      : 0;

  const seasonsPerYear = params.seasonsPerYear
    ? validateNumber(params.seasonsPerYear, 'seasonsPerYear', 1, 3)
    : 1;

  const annualWaterSavedLiters = waterSavedLiters * seasonsPerYear;
  const annualCurrentUsageLiters = currentWaterUsageLiters * seasonsPerYear;
  const annualDripUsageLiters = dripWaterUsageLiters * seasonsPerYear;

  return {
    calculationType: 'DRIP_IRRIGATION',
    period: 'SEASONAL',
    inputParams: {
      area,
      unit,
      currentMethod: currentMethodKey,
      dripEfficiencyPercent: Math.round(dripEfficiency * 100),
      seasonsPerYear,
    },
    resultMetrics: {
      areaSqM: Math.round(areaSqM),
      currentMethod: currentMethod.label,
      currentEfficiencyPercent: Math.round(currentMethod.efficiency * 100),
      dripEfficiencyPercent: Math.round(dripEfficiency * 100),
      currentConsumptionLiters: Math.round(currentWaterUsageLiters),
      dripConsumptionLiters: Math.round(dripWaterUsageLiters),
      waterSavedLiters: Math.round(waterSavedLiters),
      savingsPercent: Number(savingsPercent.toFixed(1)),
      annualCurrentUsageLiters: Math.round(annualCurrentUsageLiters),
      annualDripUsageLiters: Math.round(annualDripUsageLiters),
      annualWaterSavedLiters: Math.round(annualWaterSavedLiters),
      assumptionsDisclosed: {
        currentEfficiency: `${Math.round(currentMethod.efficiency * 100)}%`,
        dripEfficiency: `${Math.round(dripEfficiency * 100)}%`,
        seasonsPerYear,
        note: 'Drip irrigation reduces losses to evaporation and percolation. Individual field savings depend on soil permeability, pipe layout, and management.',
      },
    },
    waterSavedLiters: Math.round(waterSavedLiters),
    waterHarvestedLiters: 0,
    annualWaterSavedLiters: Math.round(annualWaterSavedLiters),
    annualWaterHarvestedLiters: null,
  };
}

/**
 * 3. Rainwater Harvesting Potential Calculator
 * Formula: Harvested Water (Litres) = Roof Area (m²) × Annual Rainfall (mm) × Runoff Efficiency
 */
export function calculateRainwaterHarvesting(params = {}) {
  const roofAreaSqM = validateNumber(params.roofAreaSqM, 'roofAreaSqM', 1, 1000000);
  const annualRainfallMm = validateNumber(params.annualRainfallMm, 'annualRainfallMm', 1, 15000);

  // Efficiency percentage (typically 70% to 90%, reasonable bounds 10% to 95%)
  const efficiencyPercent = validateNumber(
    params.efficiencyPercent !== undefined ? params.efficiencyPercent : 80,
    'efficiencyPercent',
    10,
    95
  );

  const runoffCoefficient = efficiencyPercent / 100;

  // 1 mm rainfall on 1 m² area = 1 Litre of water
  const annualHarvestedLiters = roofAreaSqM * annualRainfallMm * runoffCoefficient;
  const monthlyAverageLiters = annualHarvestedLiters / 12;
  const dailyAverageLiters = annualHarvestedLiters / 365;

  // Storage tank sizing rule of thumb:
  // Designed to capture ~20% of annual harvest or 25-day dry buffer capacity
  const recommendedTankCapacityLiters = Math.round(Math.min(annualHarvestedLiters * 0.2, 50000));

  return {
    calculationType: 'RAINWATER_HARVESTING',
    period: 'ANNUAL',
    inputParams: {
      roofAreaSqM,
      annualRainfallMm,
      efficiencyPercent,
    },
    resultMetrics: {
      roofAreaSqM,
      annualRainfallMm,
      efficiencyPercent,
      annualHarvestedLiters: Math.round(annualHarvestedLiters),
      monthlyAverageLiters: Math.round(monthlyAverageLiters),
      dailyAverageLiters: Math.round(dailyAverageLiters),
      recommendedTankCapacityLiters: Math.max(1000, recommendedTankCapacityLiters),
      assumptionsDisclosed: {
        formula: 'Annual Harvest (L) = Roof Area (m²) × Rainfall (mm) × Runoff Efficiency',
        efficiencyRatio: runoffCoefficient,
        note: 'Collection efficiency accounts for initial roof wash (first-flush system), surface adhesion, and gutter filtration.',
      },
    },
    waterSavedLiters: 0,
    waterHarvestedLiters: Math.round(annualHarvestedLiters),
    annualWaterSavedLiters: null,
    annualWaterHarvestedLiters: Math.round(annualHarvestedLiters),
  };
}

/**
 * 4. Household Water Consumption & Efficiency Calculator
 */
export function calculateHouseholdWater(params = {}) {
  const members = validateNumber(params.members, 'members', 1, 100);

  // Daily per-person or household usages with realistic defaults
  const bathingLitersPerPerson = validateNumber(
    params.bathingLitersPerPerson !== undefined ? params.bathingLitersPerPerson : 50,
    'bathingLitersPerPerson',
    5,
    300
  );
  const toiletLitersPerPerson = validateNumber(
    params.toiletLitersPerPerson !== undefined ? params.toiletLitersPerPerson : 25,
    'toiletLitersPerPerson',
    5,
    200
  );
  const laundryLitersDaily = validateNumber(
    params.laundryLitersDaily !== undefined ? params.laundryLitersDaily : 40,
    'laundryLitersDaily',
    0,
    1000
  );
  const kitchenLitersDaily = validateNumber(
    params.kitchenLitersDaily !== undefined ? params.kitchenLitersDaily : 30,
    'kitchenLitersDaily',
    0,
    1000
  );
  const otherLitersDaily = validateNumber(
    params.otherLitersDaily !== undefined ? params.otherLitersDaily : 20,
    'otherLitersDaily',
    0,
    1000
  );

  // Baseline calculations
  const dailyBathing = members * bathingLitersPerPerson;
  const dailyToilet = members * toiletLitersPerPerson;
  const dailyTotalBaseline = dailyBathing + dailyToilet + laundryLitersDaily + kitchenLitersDaily + otherLitersDaily;
  const perCapitaDailyBaseline = dailyTotalBaseline / members;

  // Selected conservation measures
  // Options:
  // - lowFlowShowerheads: 35% reduction in bathing water
  // - dualFlushToilets: 40% reduction in toilet flushing
  // - aeratedTaps: 25% reduction in kitchen and handwashing
  // - greywaterReuse: 50% reuse of laundry & shower rinse for toilet/gardening
  const measures = Array.isArray(params.conservationMeasures)
    ? params.conservationMeasures
    : typeof params.conservationMeasures === 'object' && params.conservationMeasures !== null
    ? Object.keys(params.conservationMeasures).filter((k) => params.conservationMeasures[k])
    : [];

  let dailySavings = 0;
  const measureBreakdown = {};

  if (measures.includes('lowFlowShowerheads')) {
    const saved = dailyBathing * 0.35;
    dailySavings += saved;
    measureBreakdown.lowFlowShowerheads = Math.round(saved);
  }
  if (measures.includes('dualFlushToilets')) {
    const saved = dailyToilet * 0.40;
    dailySavings += saved;
    measureBreakdown.dualFlushToilets = Math.round(saved);
  }
  if (measures.includes('aeratedTaps')) {
    const saved = (kitchenLitersDaily + otherLitersDaily * 0.5) * 0.25;
    dailySavings += saved;
    measureBreakdown.aeratedTaps = Math.round(saved);
  }
  if (measures.includes('greywaterReuse')) {
    const saved = (laundryLitersDaily + dailyBathing * 0.2) * 0.50;
    dailySavings += saved;
    measureBreakdown.greywaterReuse = Math.round(saved);
  }

  // Prevent savings exceeding baseline
  dailySavings = Math.min(dailySavings, dailyTotalBaseline * 0.75);

  const dailyConserved = dailyTotalBaseline - dailySavings;
  const monthlyBaseline = dailyTotalBaseline * 30.417;
  const monthlyConserved = dailyConserved * 30.417;
  const monthlySavings = dailySavings * 30.417;

  const annualBaseline = dailyTotalBaseline * 365;
  const annualConserved = dailyConserved * 365;
  const annualSavings = dailySavings * 365;

  const savingsPercent = dailyTotalBaseline > 0 ? (dailySavings / dailyTotalBaseline) * 100 : 0;

  return {
    calculationType: 'HOUSEHOLD',
    period: 'ANNUAL',
    inputParams: {
      members,
      bathingLitersPerPerson,
      toiletLitersPerPerson,
      laundryLitersDaily,
      kitchenLitersDaily,
      otherLitersDaily,
      conservationMeasures: measures,
    },
    resultMetrics: {
      members,
      dailyTotalBaselineLiters: Math.round(dailyTotalBaseline),
      dailyConservedLiters: Math.round(dailyConserved),
      dailySavingsLiters: Math.round(dailySavings),
      monthlyBaselineLiters: Math.round(monthlyBaseline),
      monthlyConservedLiters: Math.round(monthlyConserved),
      monthlySavingsLiters: Math.round(monthlySavings),
      annualBaselineLiters: Math.round(annualBaseline),
      annualConservedLiters: Math.round(annualConserved),
      annualWaterSavedLiters: Math.round(annualSavings),
      perCapitaDailyLiters: Math.round(perCapitaDailyBaseline),
      perCapitaConservedLiters: Math.round(dailyConserved / members),
      savingsPercent: Number(savingsPercent.toFixed(1)),
      measureBreakdown,
      assumptionsDisclosed: {
        cpheeoBenchmarkLitersPerDay: 135,
        note: 'Standard Indian urban domestic water benchmark is 135 LPCD (Ministry of Housing and Urban Affairs). Actual savings depend on fixture ratings and personal habits.',
      },
    },
    waterSavedLiters: Math.round(annualSavings),
    waterHarvestedLiters: 0,
    annualWaterSavedLiters: Math.round(annualSavings),
    annualWaterHarvestedLiters: null,
  };
}

/**
 * Dispatcher for all calculation types
 */
export function executeWaterCalculation(type, params) {
  const normalizedType = String(type || '').toUpperCase();
  switch (normalizedType) {
    case 'AGRICULTURE':
      return calculateAgricultureWater(params);
    case 'DRIP_IRRIGATION':
      return calculateDripIrrigation(params);
    case 'RAINWATER_HARVESTING':
      return calculateRainwaterHarvesting(params);
    case 'HOUSEHOLD':
      return calculateHouseholdWater(params);
    default:
      throw new Error(
        `Invalid calculationType '${type}'. Allowed types: AGRICULTURE, DRIP_IRRIGATION, RAINWATER_HARVESTING, HOUSEHOLD.`
      );
  }
}
