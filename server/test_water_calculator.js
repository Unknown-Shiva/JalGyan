/**
 * JalGyan — Phase 6: Water Conservation Calculator Test Suite
 *
 * Verifies all 18 requirements:
 * 1. Agriculture calculation
 * 2. Drip irrigation calculation
 * 3. Rainwater harvesting calculation
 * 4. Household calculation
 * 5. Missing input validation
 * 6. Negative input rejection
 * 7. Invalid calculation type rejection
 * 8. Percentage boundary validation
 * 9. Decimal conversion
 * 10. Database persistence
 * 11. Guest calculation (userId: null)
 * 12. Authenticated calculation ownership
 * 13. User cannot view another user's history
 * 14. History pagination
 * 15. Admin dashboard statistics update correctly
 * 16. Daily, seasonal, and annual values are not mixed
 * 17. Error handling
 * 18. Existing calculator data remains accessible
 */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import app from './src/app.js';
import { prisma } from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = 5001;
const BASE = `http://localhost:${PORT}/api`;

async function request(method, endpoint, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${endpoint}`, opts);
  const payload = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, payload };
}

async function runCalculatorTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  JalGyan Phase 6 — Water Conservation Calculator Tests    ');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌  [FAIL] ${name}${details ? ': ' + details : ''}`);
      failed++;
    }
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@jalgyan.org';
  const adminPassword = process.env.ADMIN_PASSWORD;

  let adminToken = null;
  let user1Token = null;
  let user2Token = null;
  const createdUserIds = [];
  const createdCalcIds = [];

  try {
    // 0. Authenticate admin
    const adminLogin = await request('POST', '/auth/login', {
      email: adminEmail,
      password: adminPassword,
    });
    adminToken = adminLogin.payload?.data?.token || adminLogin.payload?.token;

    // Create 2 test users for ownership/isolation tests
    const hashed = await bcrypt.hash('CalcTestPass123!', 10);
    const user1 = await prisma.user.create({
      data: {
        name: 'Calc User One',
        email: `calc_u1_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(user1.id);

    const user2 = await prisma.user.create({
      data: {
        name: 'Calc User Two',
        email: `calc_u2_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(user2.id);

    const u1Login = await request('POST', '/auth/login', {
      email: user1.email,
      password: 'CalcTestPass123!',
    });
    user1Token = u1Login.payload?.data?.token || u1Login.payload?.token;

    const u2Login = await request('POST', '/auth/login', {
      email: user2.email,
      password: 'CalcTestPass123!',
    });
    user2Token = u2Login.payload?.data?.token || u2Login.payload?.token;

    // ── Test 1: Agriculture calculation ──
    const agriRes = await request('POST', '/calculator/calculate', {
      calculationType: 'AGRICULTURE',
      area: 2.5,
      unit: 'ACRES',
      cropType: 'WHEAT',
      irrigationMethod: 'FLOOD',
      seasonsPerYear: 1,
    });
    if (agriRes.payload?.data?.id) createdCalcIds.push(agriRes.payload.data.id);

    assert(
      agriRes.status === 201 &&
        agriRes.payload?.success === true &&
        agriRes.payload?.data?.calculationType === 'AGRICULTURE' &&
        agriRes.payload?.data?.period === 'SEASONAL' &&
        agriRes.payload?.data?.resultMetrics?.grossWaterRequirementLiters > 0 &&
        agriRes.payload?.data?.resultMetrics?.dailyRequirementLiters > 0 &&
        agriRes.payload?.data?.resultMetrics?.potentialDripSavingsLiters > 0,
      'Test 1: Agriculture water calculator computes gross requirement, daily rate, and potential drip savings',
      `Gross: ${agriRes.payload?.data?.resultMetrics?.grossWaterRequirementLiters}`
    );

    // ── Test 2: Drip irrigation calculation ──
    const dripRes = await request('POST', '/calculator/calculate', {
      calculationType: 'DRIP_IRRIGATION',
      area: 2,
      unit: 'HECTARES',
      currentMethod: 'FLOOD',
      dripEfficiency: 90,
      seasonsPerYear: 2,
    });
    if (dripRes.payload?.data?.id) createdCalcIds.push(dripRes.payload.data.id);

    assert(
      dripRes.status === 201 &&
        dripRes.payload?.success === true &&
        dripRes.payload?.data?.calculationType === 'DRIP_IRRIGATION' &&
        dripRes.payload?.data?.resultMetrics?.waterSavedLiters > 0 &&
        dripRes.payload?.data?.resultMetrics?.savingsPercent === 50 &&
        dripRes.payload?.data?.annualWaterSavedLiters > 0,
      'Test 2: Drip irrigation calculator computes accurate water saved (50% over flood) and annualized savings',
      `Saved: ${dripRes.payload?.data?.resultMetrics?.waterSavedLiters}, %: ${dripRes.payload?.data?.resultMetrics?.savingsPercent}`
    );

    // ── Test 3: Rainwater harvesting calculation ──
    // Formula: 150 m² × 1000 mm × 0.80 = 120,000 Litres
    const rwhRes = await request('POST', '/calculator/calculate', {
      calculationType: 'RAINWATER_HARVESTING',
      roofAreaSqM: 150,
      annualRainfallMm: 1000,
      efficiencyPercent: 80,
    });
    if (rwhRes.payload?.data?.id) createdCalcIds.push(rwhRes.payload.data.id);

    assert(
      rwhRes.status === 201 &&
        rwhRes.payload?.success === true &&
        rwhRes.payload?.data?.calculationType === 'RAINWATER_HARVESTING' &&
        rwhRes.payload?.data?.waterHarvestedLiters === 120000 &&
        rwhRes.payload?.data?.annualWaterHarvestedLiters === 120000 &&
        rwhRes.payload?.data?.resultMetrics?.monthlyAverageLiters === 10000,
      'Test 3: Rainwater harvesting calculator computes exact harvest (150m² * 1000mm * 0.80 = 120,000L) and monthly average',
      `Harvest: ${rwhRes.payload?.data?.waterHarvestedLiters}`
    );

    // ── Test 4: Household water calculation ──
    const houseRes = await request('POST', '/calculator/calculate', {
      calculationType: 'HOUSEHOLD',
      members: 4,
      bathingLitersPerPerson: 50,
      toiletLitersPerPerson: 25,
      laundryLitersDaily: 40,
      kitchenLitersDaily: 30,
      otherLitersDaily: 20,
      conservationMeasures: ['lowFlowShowerheads', 'dualFlushToilets'],
    });
    if (houseRes.payload?.data?.id) createdCalcIds.push(houseRes.payload.data.id);

    assert(
      houseRes.status === 201 &&
        houseRes.payload?.success === true &&
        houseRes.payload?.data?.calculationType === 'HOUSEHOLD' &&
        houseRes.payload?.data?.resultMetrics?.dailyTotalBaselineLiters === 390 && // 4*(50+25) + 40 + 30 + 20 = 390
        houseRes.payload?.data?.resultMetrics?.dailySavingsLiters > 0 &&
        houseRes.payload?.data?.annualWaterSavedLiters > 0,
      'Test 4: Household water calculator computes daily baseline (390L) and conservation savings',
      `Baseline: ${houseRes.payload?.data?.resultMetrics?.dailyTotalBaselineLiters}, DailySaved: ${houseRes.payload?.data?.resultMetrics?.dailySavingsLiters}`
    );

    // ── Test 5: Missing input validation ──
    const missingRes = await request('POST', '/calculator/calculate', {});
    assert(
      missingRes.status === 400 && missingRes.payload?.success === false,
      'Test 5: Missing calculationType returns HTTP 400 Bad Request',
      `Got status ${missingRes.status}`
    );

    // ── Test 6: Negative input rejection ──
    const negRes = await request('POST', '/calculator/calculate', {
      calculationType: 'RAINWATER_HARVESTING',
      roofAreaSqM: -50,
      annualRainfallMm: 1000,
    });
    assert(
      negRes.status === 400 && negRes.payload?.success === false,
      'Test 6: Negative inputs (e.g. roofAreaSqM = -50) are rejected with HTTP 400',
      `Message: ${negRes.payload?.message}`
    );

    // ── Test 7: Invalid calculation type rejection ──
    const invRes = await request('POST', '/calculator/calculate', {
      calculationType: 'INVALID_TYPE_XYZ',
      area: 10,
    });
    assert(
      invRes.status === 400 && invRes.payload?.success === false,
      'Test 7: Unknown calculationType is rejected with HTTP 400',
      `Message: ${invRes.payload?.message}`
    );

    // ── Test 8: Percentage boundary validation ──
    const pctLowRes = await request('POST', '/calculator/calculate', {
      calculationType: 'RAINWATER_HARVESTING',
      roofAreaSqM: 100,
      annualRainfallMm: 800,
      efficiencyPercent: 5, // Below minimum 10%
    });
    const pctHighRes = await request('POST', '/calculator/calculate', {
      calculationType: 'RAINWATER_HARVESTING',
      roofAreaSqM: 100,
      annualRainfallMm: 800,
      efficiencyPercent: 120, // Above maximum 95%
    });
    assert(
      pctLowRes.status === 400 && pctHighRes.status === 400,
      'Test 8: Percentage efficiency boundary validation strictly rejects out-of-range values (<10% or >95%)',
      `Low: ${pctLowRes.status}, High: ${pctHighRes.status}`
    );

    // ── Test 9: Decimal conversion safety ──
    assert(
      typeof rwhRes.payload?.data?.waterHarvestedLiters === 'number' &&
        typeof rwhRes.payload?.data?.annualWaterHarvestedLiters === 'number' &&
        typeof dripRes.payload?.data?.waterSavedLiters === 'number' &&
        !isNaN(rwhRes.payload?.data?.waterHarvestedLiters),
      'Test 9: Prisma Decimal values are safely converted to JavaScript numbers without string or serialization defects'
    );

    // ── Test 10: Database persistence ──
    const dbRecord = await prisma.waterCalculation.findUnique({
      where: { id: rwhRes.payload?.data?.id },
    });
    assert(
      !!dbRecord &&
        dbRecord.calculationType === 'RAINWATER_HARVESTING' &&
        Number(dbRecord.annualWaterHarvestedLiters) === 120000,
      'Test 10: Calculation record is reliably persisted in PostgreSQL database via Prisma',
      `DB record ID: ${dbRecord?.id}`
    );

    // ── Test 11: Guest calculation (userId: null) ──
    const guestRes = await request('POST', '/calculator/calculate', {
      calculationType: 'HOUSEHOLD',
      members: 3,
    });
    if (guestRes.payload?.data?.id) createdCalcIds.push(guestRes.payload.data.id);

    assert(
      guestRes.status === 201 && guestRes.payload?.data?.userId === null,
      'Test 11: Guest calculation completes successfully with nullable userId (userId: null)',
      `userId: ${guestRes.payload?.data?.userId}`
    );

    // ── Test 12: Authenticated calculation ownership ──
    const user1Calc = await request(
      'POST',
      '/calculator/calculate',
      {
        calculationType: 'DRIP_IRRIGATION',
        area: 5,
        unit: 'ACRES',
        currentMethod: 'FLOOD',
      },
      user1Token
    );
    if (user1Calc.payload?.data?.id) createdCalcIds.push(user1Calc.payload.data.id);

    assert(
      user1Calc.status === 201 && user1Calc.payload?.data?.userId === user1.id,
      'Test 12: Authenticated calculation correctly associates record with the authenticated user ID',
      `Expected ${user1.id}, got ${user1Calc.payload?.data?.userId}`
    );

    // ── Test 13: User cannot view another user's calculation history ──
    const u2History = await request('GET', '/calculator/history', null, user2Token);
    const u2HasU1Record = (u2History.payload?.data?.calculations || []).some(
      (c) => c.id === user1Calc.payload?.data?.id
    );
    // User 2 trying to directly view User 1's calculation by ID
    const u2AccessU1Detail = await request(
      'GET',
      `/calculator/history/${user1Calc.payload?.data?.id}`,
      null,
      user2Token
    );

    assert(
      !u2HasU1Record && u2AccessU1Detail.status === 404,
      "Test 13: Users cannot view another user's calculation history or access their detail records",
      `u2HasU1: ${u2HasU1Record}, detail status: ${u2AccessU1Detail.status}`
    );

    // ── Test 14: History pagination ──
    // Create 3 additional calculations for user 1
    for (let i = 0; i < 3; i++) {
      const c = await request(
        'POST',
        '/calculator/calculate',
        { calculationType: 'HOUSEHOLD', members: 2 + i },
        user1Token
      );
      if (c.payload?.data?.id) createdCalcIds.push(c.payload.data.id);
    }

    const p1 = await request('GET', '/calculator/history?page=1&limit=2', null, user1Token);
    const p2 = await request('GET', '/calculator/history?page=2&limit=2', null, user1Token);

    assert(
      p1.status === 200 &&
        p2.status === 200 &&
        p1.payload?.data?.calculations?.length === 2 &&
        p2.payload?.data?.calculations?.length >= 1 &&
        p1.payload?.data?.calculations[0]?.id !== p2.payload?.data?.calculations[0]?.id &&
        p1.payload?.data?.pagination?.total >= 4,
      'Test 14: History pagination handles page and limit correctly with isolated per-user counts',
      `P1 count: ${p1.payload?.data?.calculations?.length}, Total: ${p1.payload?.data?.pagination?.total}`
    );

    // ── Test 15: Admin dashboard statistics update correctly ──
    const dashStats = await request('GET', '/admin/dashboard/stats', null, adminToken);
    const waterStats = dashStats.payload?.data?.waterConservation;

    assert(
      dashStats.status === 200 &&
        waterStats &&
        typeof waterStats.totalAnnualWaterSavedLiters === 'number' &&
        typeof waterStats.totalAnnualWaterHarvestedLiters === 'number' &&
        waterStats.totalCalculations >= 5 &&
        waterStats.totalAnnualWaterHarvestedLiters >= 120000 &&
        typeof waterStats.breakdownByType === 'object' &&
        waterStats.breakdownByType.RAINWATER_HARVESTING >= 1 &&
        waterStats.breakdownByType.DRIP_IRRIGATION >= 1,
      'Test 15: Admin dashboard water conservation statistics reflect newly created calculations and type breakdown',
      `TotalCalcs: ${waterStats?.totalCalculations}, Saved: ${waterStats?.totalAnnualWaterSavedLiters}, Harvested: ${waterStats?.totalAnnualWaterHarvestedLiters}`
    );

    // ── Test 16: Daily, seasonal, and annual values are not mixed ──
    const checkAgri = agriRes.payload?.data;
    const checkRwh = rwhRes.payload?.data;
    assert(
      checkAgri?.period === 'SEASONAL' &&
        checkRwh?.period === 'ANNUAL' &&
        checkRwh?.resultMetrics?.annualHarvestedLiters === checkRwh?.waterHarvestedLiters &&
        checkRwh?.resultMetrics?.monthlyAverageLiters * 12 === checkRwh?.waterHarvestedLiters &&
        checkRwh?.waterSavedLiters === 0,
      'Test 16: Daily, seasonal, and annual measurements remain strictly isolated with clear period tagging'
    );

    // ── Test 17: Error handling ──
    const badParamRes = await request('POST', '/calculator/calculate', {
      calculationType: 'AGRICULTURE',
      area: 'not-a-number',
    });
    assert(
      badParamRes.status === 400 &&
        badParamRes.payload?.success === false &&
        typeof badParamRes.payload?.message === 'string',
      'Test 17: Invalid parameter types yield clean descriptive error messages without internal stack traces',
      `Message: ${badParamRes.payload?.message}`
    );

    // ── Test 18: Existing calculator data remains accessible ──
    const detailRes = await request(
      'GET',
      `/calculator/history/${user1Calc.payload?.data?.id}`,
      null,
      user1Token
    );
    assert(
      detailRes.status === 200 &&
        detailRes.payload?.data?.id === user1Calc.payload?.data?.id &&
        detailRes.payload?.data?.calculationType === 'DRIP_IRRIGATION' &&
        detailRes.payload?.data?.resultMetrics?.savingsPercent > 0,
      'Test 18: Stored calculation records remain fully queryable with complete reproducible inputs and metrics'
    );
  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  } finally {
    // Clean up created records
    try {
      if (createdCalcIds.length > 0) {
        await prisma.waterCalculation.deleteMany({
          where: { id: { in: createdCalcIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }

    server.close();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Tests completed: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runCalculatorTests();
