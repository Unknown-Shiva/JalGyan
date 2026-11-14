import { prisma } from '../config/db.js';
import { executeWaterCalculation } from '../utils/waterCalculations.js';

/**
 * Safely format a Prisma WaterCalculation record, converting Decimals to numbers
 */
function formatCalculationRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.userId,
    calculationType: record.calculationType,
    period: record.period,
    inputParams: record.inputParams,
    resultMetrics: record.resultMetrics,
    waterSavedLiters: record.waterSavedLiters ? Number(record.waterSavedLiters) : 0,
    waterHarvestedLiters: record.waterHarvestedLiters ? Number(record.waterHarvestedLiters) : 0,
    annualWaterSavedLiters: record.annualWaterSavedLiters !== null ? Number(record.annualWaterSavedLiters) : null,
    annualWaterHarvestedLiters: record.annualWaterHarvestedLiters !== null ? Number(record.annualWaterHarvestedLiters) : null,
    notes: record.notes,
    createdAt: record.createdAt,
  };
}

/**
 * POST /api/calculator/calculate
 * Execute a calculation and persist it to the database
 * Supports both authenticated users and guests (userId: null)
 */
export const calculateWater = async (req, res, next) => {
  try {
    const { calculationType, inputParams, notes, period, ...restBody } = req.body || {};

    if (!calculationType) {
      return res.status(400).json({
        success: false,
        message: 'calculationType is required. Allowed types: AGRICULTURE, DRIP_IRRIGATION, RAINWATER_HARVESTING, HOUSEHOLD.',
      });
    }

    // Merge parameters from inputParams object or top-level body
    const params = {
      ...(inputParams && typeof inputParams === 'object' ? inputParams : {}),
      ...restBody,
    };

    // Execute reproducible calculation
    let calcResult;
    try {
      calcResult = executeWaterCalculation(calculationType, params);
    } catch (valErr) {
      return res.status(400).json({
        success: false,
        message: valErr.message,
      });
    }

    // Determine user association
    const userId = req.user?.id || null;

    // Use derived period or fallback
    const resolvedPeriod = calcResult.period || period || 'ANNUAL';

    // Persist calculation record in database
    const savedRecord = await prisma.waterCalculation.create({
      data: {
        userId,
        calculationType: calcResult.calculationType,
        period: resolvedPeriod,
        inputParams: calcResult.inputParams,
        resultMetrics: calcResult.resultMetrics,
        waterSavedLiters: calcResult.waterSavedLiters,
        waterHarvestedLiters: calcResult.waterHarvestedLiters,
        annualWaterSavedLiters: calcResult.annualWaterSavedLiters,
        annualWaterHarvestedLiters: calcResult.annualWaterHarvestedLiters,
        notes: typeof notes === 'string' ? notes.trim() : null,
      },
    });

    res.status(201).json({
      success: true,
      data: formatCalculationRecord(savedRecord),
      message: 'Calculation completed and recorded successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/calculator/history
 * Retrieve paginated history of calculations for the authenticated user
 */
export const getCalculationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const typeFilter = req.query.type;

    const page = rawPage !== undefined ? parseInt(rawPage, 10) : 1;
    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer greater than or equal to 1.',
      });
    }

    const limit = rawLimit !== undefined ? parseInt(rawLimit, 10) : 10;
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be an integer between 1 and 50.',
      });
    }

    const where = {
      userId,
      ...(typeFilter && typeFilter !== 'ALL' ? { calculationType: String(typeFilter).toUpperCase() } : {}),
    };

    const [total, records] = await Promise.all([
      prisma.waterCalculation.count({ where }),
      prisma.waterCalculation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        calculations: records.map(formatCalculationRecord),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/calculator/history/:id
 * Retrieve details of a specific calculation record belonging to the authenticated user
 */
export const getCalculationById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid calculation ID is required.',
      });
    }

    const record = await prisma.waterCalculation.findUnique({
      where: { id },
    });

    if (!record || record.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Calculation record not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: formatCalculationRecord(record),
    });
  } catch (error) {
    next(error);
  }
};
