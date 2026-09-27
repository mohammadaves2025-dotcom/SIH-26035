import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Manufacturer } from '../models/Manufacturer.js';
import { InstrumentModel } from '../models/InstrumentModel.js';
import { RuleConfig } from '../models/RuleConfig.js';
import { TestSession } from '../models/TestSession.js';
import { Observation } from '../models/Observation.js';
import { Report, Counter } from '../models/Report.js';
import { AuditLog } from '../models/AuditLog.js';
import { Laboratory } from '../models/Laboratory.js';
import { TestType } from '../models/TestType.js';
import { appendAuditLog } from '../services/auditLogger.service.js';
import { env } from '../config/env.js';

export async function seedDemoData() {
  console.log('Seeding rich Legal Metrology & OIML R-76 demo datasets (All 7 Roles & ERD Entities)...');

  // 1. Clean test sessions, observations, reports, counters & audit logs
  await Promise.all([
    TestSession.deleteMany({}),
    Observation.deleteMany({}),
    Report.deleteMany({}),
    Counter.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // 2. Seed Laboratories (Section 7.1 ERD Entity)
  const initialLabs = [
    { labId: 'LAB-DELHI-01', labName: 'National Physical Laboratory (NPL New Delhi)', accreditationNo: 'NABL-TC-8891', location: 'New Delhi, Delhi', contactEmail: 'metrology@npl.res.in' },
    { labId: 'LAB-AHM-02', labName: 'Regional Reference Standards Laboratory (RRSL Ahmedabad)', accreditationNo: 'NABL-TC-4412', location: 'Ahmedabad, Gujarat', contactEmail: 'rrsl.ahm@nawi.gov.in' },
    { labId: 'LAB-BLR-03', labName: 'Regional Reference Standards Laboratory (RRSL Bengaluru)', accreditationNo: 'NABL-TC-5520', location: 'Bengaluru, Karnataka', contactEmail: 'rrsl.blr@nawi.gov.in' },
    { labId: 'LAB-MUM-04', labName: 'Regional Reference Standards Laboratory (RRSL Mumbai)', accreditationNo: 'NABL-TC-7711', location: 'Mumbai, Maharashtra', contactEmail: 'rrsl.mum@nawi.gov.in' },
  ];

  const laboratories = [];
  for (const l of initialLabs) {
    const doc = await Laboratory.findOneAndUpdate({ labId: l.labId }, l, { upsert: true, new: true });
    laboratories.push(doc);
  }

  // 3. Seed TestTypes (Section 7.1 ERD Entity)
  const initialTestTypes = [
    { testTypeId: 'TT-ADMIN-01', testName: 'Administrative & Marking Examination', oimlAnnexRef: 'A1_administrative', formulaRef: 'Checklist Pass/Fail' },
    { testTypeId: 'TT-CONST-02', testName: 'Construction & Sealing Point Examination', oimlAnnexRef: 'A2_construction', formulaRef: 'Checklist Pass/Fail' },
    { testTypeId: 'TT-ACC-03', testName: 'Static Weighing Accuracy Performance Test', oimlAnnexRef: 'A4_accuracy', formulaRef: 'E = I - L' },
    { testTypeId: 'TT-ECC-04', testName: 'Corner-Load Eccentricity Evaluation Test', oimlAnnexRef: 'A4_eccentricity', formulaRef: 'E = I - L' },
    { testTypeId: 'TT-REP-05', testName: 'Repeatability Consistency Test', oimlAnnexRef: 'A4_repeatability', formulaRef: 'E = I - L' },
  ];

  for (const tt of initialTestTypes) {
    await TestType.findOneAndUpdate({ testTypeId: tt.testTypeId }, tt, { upsert: true, new: true });
  }

  // 4. Seed RuleConfigs (Table 9.2 OIML R-76 MPE Bands)
  const initialRules = [
    {
      oimlEdition: 'R76-1:2006',
      accuracyClass: 'I',
      effectiveDate: new Date('2011-04-01'),
      bands: [
        { uptoMultipleOfE: 50000, mpeFactor: 0.5 },
        { uptoMultipleOfE: 200000, mpeFactor: 1.0 },
        { uptoMultipleOfE: 999999999, mpeFactor: 1.5 },
      ],
    },
    {
      oimlEdition: 'R76-1:2006',
      accuracyClass: 'II',
      effectiveDate: new Date('2011-04-01'),
      bands: [
        { uptoMultipleOfE: 5000, mpeFactor: 0.5 },
        { uptoMultipleOfE: 20000, mpeFactor: 1.0 },
        { uptoMultipleOfE: 100000, mpeFactor: 1.5 },
      ],
    },
    {
      oimlEdition: 'R76-1:2006',
      accuracyClass: 'III',
      effectiveDate: new Date('2011-04-01'),
      bands: [
        { uptoMultipleOfE: 500, mpeFactor: 0.5 },
        { uptoMultipleOfE: 2000, mpeFactor: 1.0 },
        { uptoMultipleOfE: 10000, mpeFactor: 1.5 },
      ],
    },
    {
      oimlEdition: 'R76-1:2006',
      accuracyClass: 'IIII',
      effectiveDate: new Date('2011-04-01'),
      bands: [
        { uptoMultipleOfE: 50, mpeFactor: 0.5 },
        { uptoMultipleOfE: 200, mpeFactor: 1.0 },
        { uptoMultipleOfE: 1000, mpeFactor: 1.5 },
      ],
    },
  ];

  const rules = [];
  for (const r of initialRules) {
    const doc = await RuleConfig.findOneAndUpdate(
      { accuracyClass: r.accuracyClass, oimlEdition: r.oimlEdition },
      r,
      { upsert: true, new: true }
    );
    rules.push(doc);
  }

  // 5. Seed Manufacturers
  const initialManufacturers = [
    {
      name: 'Avery India Ltd',
      contactEmail: 'contact@averyindia.com',
      address: 'Plot 5, Sector 24, Industrial Area, Faridabad, Haryana 121005 (LM/HR/2024/001)',
    },
    {
      name: 'Mettler Toledo India Pvt Ltd',
      contactEmail: 'info@mettler.co.in',
      address: 'Powai Industrial Estate, Saki Vihar Road, Mumbai, Maharashtra 400072 (LM/MAH/2023/108)',
    },
    {
      name: 'Essae-Teraoka Ltd',
      contactEmail: 'support@essae.com',
      address: '377/2, 10th Cross, IV Phase, Peenya Industrial Area, Bengaluru, Karnataka 560058 (LM/KA/2022/450)',
    },
    {
      name: 'Sansui Electronics',
      contactEmail: 'contact@sansuiweigh.com',
      address: 'GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat 382445 (LM/GUJ/2024/099)',
    },
  ];

  const manufacturers = [];
  for (const m of initialManufacturers) {
    const doc = await Manufacturer.findOneAndUpdate({ name: m.name }, m, { upsert: true, new: true });
    manufacturers.push(doc);
  }

  // 6. Seed Instrument Models
  const initialModels = [
    {
      manufacturerId: manufacturers[0]._id,
      modelName: 'E1205-1500 (Heavy Platform)',
      accuracyClass: 'III',
      maxCapacity: 1500,
      e: 0.5,
      minCapacity: 10,
      n: 3000,
    },
    {
      manufacturerId: manufacturers[1]._id,
      modelName: 'XPE-205 (Micro-Balance)',
      accuracyClass: 'I',
      maxCapacity: 220,
      e: 0.001,
      minCapacity: 0.01,
      n: 220000,
    },
    {
      manufacturerId: manufacturers[2]._id,
      modelName: 'DS-215 (Jewellery Balance)',
      accuracyClass: 'II',
      maxCapacity: 15,
      e: 0.1,
      minCapacity: 5,
      n: 150000,
    },
    {
      manufacturerId: manufacturers[2]._id,
      modelName: 'POS-30 (Retail Scale)',
      accuracyClass: 'III',
      maxCapacity: 30,
      e: 5,
      minCapacity: 100,
      n: 6000,
    },
    {
      manufacturerId: manufacturers[3]._id,
      modelName: 'WB-50T (Truck Weighbridge)',
      accuracyClass: 'IIII',
      maxCapacity: 50000,
      e: 20,
      minCapacity: 400,
      n: 2500,
    },
  ];

  const models = [];
  for (const mod of initialModels) {
    const doc = await InstrumentModel.findOneAndUpdate({ modelName: mod.modelName }, mod, { upsert: true, new: true });
    models.push(doc);
  }

  // 7. Seed All 7 User Roles (§4 Table of Architecture Blueprint)
  const passwordHash = await bcrypt.hash('Password123!', env.BCRYPT_SALT_ROUNDS || 10);
  const initialUsers = [
    { name: 'System Admin', email: 'admin@nawi.gov.in', passwordHash, role: 'admin', labId: null },
    { name: 'Shri V. K. Gupta (Reviewing Officer)', email: 'reviewer@doca.gov.in', passwordHash, role: 'reviewer', labId: null },
    { name: 'Dr. Rajesh Kumar (NPL Metrologist)', email: 'tech@npl.res.in', passwordHash, role: 'lab_technician', labId: 'LAB-DELHI-01', laboratoryRef: laboratories[0]._id },
    { name: 'Smt. Anita Roy (Lab Administrator)', email: 'labadmin@npl.res.in', passwordHash, role: 'lab_admin', labId: 'LAB-DELHI-01', laboratoryRef: laboratories[0]._id },
    { name: 'Controller of Legal Metrology', email: 'doca.controller@doca.gov.in', passwordHash, role: 'doca_officer', labId: null },
    { name: 'Avery India Representative', email: 'rep@averyindia.com', passwordHash, role: 'manufacturer', labId: null },
    { name: 'CAG Compliance Auditor', email: 'auditor@cag.gov.in', passwordHash, role: 'auditor', labId: null },
  ];

  const users = [];
  for (const u of initialUsers) {
    const doc = await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
    users.push(doc);
  }

  const techDelhi = users[2];
  const reviewer = users[1];

  // 8. Seed Test Sessions
  const session1 = await TestSession.create({
    instrumentModelId: models[0]._id,
    serialNumber: 'SN-2026-001',
    accuracyClass: 'III',
    maxCapacity: 1500,
    minCapacity: 10,
    scaleInterval: 0.5,
    labId: 'LAB-DELHI-01',
    laboratoryRef: laboratories[0]._id,
    createdBy: techDelhi._id,
    testDate: new Date('2026-09-15'),
    status: 'published',
    overallResult: 'pass',
    environmentalConditions: {
      temperatureC: 22.5,
      humidityPercent: 55,
      inclinationDeg: 0.0,
      notes: 'Calibrated using E2 reference weights at NPL Metrology Lab',
    },
  });

  const obs1 = await Observation.insertMany([
    {
      testSessionId: session1._id,
      annexRef: 'A1_administrative',
      evaluationMethod: 'manual_checklist',
      checklistPassed: true,
      reviewerNotes: 'Documentary verification of Legal Metrology licence LM/HR/2024/001 verified.',
      outcome: 'pass',
    },
    {
      testSessionId: session1._id,
      annexRef: 'A2_construction',
      evaluationMethod: 'manual_checklist',
      checklistPassed: true,
      reviewerNotes: 'Sealing points and levelling indicator compliant with OIML R-76-1 Section 3.9.',
      outcome: 'pass',
    },
    {
      testSessionId: session1._id,
      annexRef: 'A4_accuracy',
      evaluationMethod: 'mpe_band',
      referenceLoad: 250,
      indicatedValue: 250.1,
      computedError: 0.1,
      appliedMpe: 0.25,
      ruleConfigId: rules[2]._id,
      outcome: 'pass',
    },
    {
      testSessionId: session1._id,
      annexRef: 'A4_accuracy',
      evaluationMethod: 'mpe_band',
      referenceLoad: 750,
      indicatedValue: 750.3,
      computedError: 0.3,
      appliedMpe: 0.50,
      ruleConfigId: rules[2]._id,
      outcome: 'pass',
    },
    {
      testSessionId: session1._id,
      annexRef: 'A4_eccentricity',
      evaluationMethod: 'mpe_band',
      referenceLoad: 500,
      indicatedValue: 500.2,
      computedError: 0.2,
      appliedMpe: 0.50,
      ruleConfigId: rules[2]._id,
      outcome: 'pass',
    },
  ]);

  const session2 = await TestSession.create({
    instrumentModelId: models[3]._id,
    serialNumber: 'SN-2026-002',
    accuracyClass: 'III',
    maxCapacity: 30,
    minCapacity: 100,
    scaleInterval: 5,
    labId: 'LAB-BLR-03',
    laboratoryRef: laboratories[2]._id,
    createdBy: techDelhi._id,
    testDate: new Date('2026-09-20'),
    status: 'failed',
    overallResult: 'fail',
    environmentalConditions: {
      temperatureC: 25.0,
      humidityPercent: 62,
      inclinationDeg: 0.2,
      notes: 'Corner load eccentricity error detected exceeding MPE tolerance.',
    },
  });

  await Observation.insertMany([
    {
      testSessionId: session2._id,
      annexRef: 'A4_eccentricity',
      evaluationMethod: 'mpe_band',
      referenceLoad: 10,
      indicatedValue: 10.02,
      computedError: 0.02,
      appliedMpe: 0.005,
      ruleConfigId: rules[2]._id,
      outcome: 'fail',
    },
  ]);

  const session3 = await TestSession.create({
    instrumentModelId: models[1]._id,
    serialNumber: 'SN-2026-003',
    accuracyClass: 'I',
    maxCapacity: 220,
    minCapacity: 0.01,
    scaleInterval: 0.001,
    labId: 'LAB-DELHI-01',
    laboratoryRef: laboratories[0]._id,
    createdBy: techDelhi._id,
    testDate: new Date('2026-09-24'),
    status: 'submitted',
    overallResult: null,
    environmentalConditions: {
      temperatureC: 20.0,
      humidityPercent: 45,
      inclinationDeg: 0.0,
      notes: 'Cleanroom climate controlled testing chamber.',
    },
  });

  await Observation.insertMany([
    {
      testSessionId: session3._id,
      annexRef: 'A4_accuracy',
      evaluationMethod: 'mpe_band',
      referenceLoad: 50,
      indicatedValue: 50.0002,
      computedError: 0.0002,
      appliedMpe: 0.0005,
      ruleConfigId: rules[0]._id,
      outcome: 'pass',
    },
  ]);

  await TestSession.create({
    instrumentModelId: models[2]._id,
    serialNumber: 'SN-2026-004',
    accuracyClass: 'II',
    maxCapacity: 15,
    minCapacity: 5,
    scaleInterval: 0.1,
    labId: 'LAB-AHM-02',
    laboratoryRef: laboratories[1]._id,
    createdBy: techDelhi._id,
    testDate: new Date('2026-09-26'),
    status: 'draft',
    overallResult: null,
    environmentalConditions: {
      temperatureC: 23.0,
      humidityPercent: 50,
      notes: 'Evaluation in progress.',
    },
  });

  // 9. Counter & Report
  await Counter.findOneAndUpdate({ name: 'reportNumber' }, { seq: 1 }, { upsert: true });
  const report1 = await Report.create({
    testSessionId: session1._id,
    reportNumber: 'NAWI-2026-000001',
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    pdfPath: 'uploads/reports/NAWI-2026-000001.pdf',
    docxPath: 'uploads/reports/NAWI-2026-000001.docx',
    status: 'signed',
    signedBy: reviewer._id,
    signedAt: new Date('2026-09-16'),
  });

  // 10. Audit Logs
  await appendAuditLog({
    entityType: 'TestSession',
    entityId: session1._id,
    action: 'CREATE_SESSION',
    userId: techDelhi._id,
  });

  await appendAuditLog({
    entityType: 'Observation',
    entityId: obs1[0]._id,
    action: 'ADD_OBSERVATION',
    userId: techDelhi._id,
  });

  await appendAuditLog({
    entityType: 'TestSession',
    entityId: session1._id,
    action: 'SUBMIT_SESSION',
    userId: techDelhi._id,
  });

  await appendAuditLog({
    entityType: 'TestSession',
    entityId: session1._id,
    action: 'EVALUATE_SESSION',
    userId: reviewer._id,
  });

  await appendAuditLog({
    entityType: 'Report',
    entityId: report1._id,
    action: 'GENERATE_REPORT',
    userId: reviewer._id,
  });

  console.log('Legal Metrology demo datasets seeded successfully with 7 roles and all ERD entities!');
  return {
    sessionsCount: 4,
    reportsCount: 1,
    manufacturersCount: manufacturers.length,
    modelsCount: models.length,
    laboratoriesCount: laboratories.length,
  };
}

if (process.argv[1] && process.argv[1].endsWith('seedDemoData.js')) {
  mongoose.connect(env.MONGO_URI).then(async () => {
    await seedDemoData();
    await mongoose.disconnect();
    console.log('Done.');
  });
}
