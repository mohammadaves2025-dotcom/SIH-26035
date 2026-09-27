import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
} from 'docx';
import { TestSession } from '../models/TestSession.js';
import { Observation } from '../models/Observation.js';
import { InstrumentModel } from '../models/InstrumentModel.js';
import { Manufacturer } from '../models/Manufacturer.js';
import { Attachment } from '../models/Attachment.js';
import { Report, Counter } from '../models/Report.js';
import { sha256, signData } from '../utils/hash.js';
import { appendAuditLog } from './auditLogger.service.js';
import { AppError } from '../utils/AppError.js';

const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function getBrowserExecutablePath() {
  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

async function getNextReportNumber() {
  const year = new Date().getFullYear();
  const counterName = `report_seq_${year}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = String(counter.seq).padStart(6, '0');
  return `NAWI-${year}-${seqStr}`;
}

function generateHtmlTemplate({ reportNumber, session, model, manufacturer, observations, attachments, generatedAt }) {
  const verificationUrl = process.env.PUBLIC_APP_URL
    ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, '')}/verify?q=${encodeURIComponent(reportNumber)}`
    : null;
  const obsRows = observations
    .map(
      (obs, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(obs.annexRef)}</td>
      <td>${escapeHtml(obs.evaluationMethod)}</td>
      <td>${obs.referenceLoad ?? '-'}</td>
      <td>${obs.indicatedValue ?? '-'}</td>
      <td>${obs.zeroCorrection ?? '-'}</td>
      <td>${obs.computedError !== undefined ? obs.computedError.toFixed(4) : '-'}</td>
      <td>${obs.appliedMpe !== undefined ? obs.appliedMpe.toFixed(4) : '-'}</td>
      <td>${escapeHtml(obs.ruleConfigId?.oimlEdition || 'Checklist')}${obs.ruleConfigId?.sourceReference ? ` — ${escapeHtml(obs.ruleConfigId.sourceReference)}` : ''}</td>
      <td><strong style="color: ${obs.outcome === 'pass' ? '#16a34a' : '#dc2626'}">${(obs.outcome || '').toUpperCase()}</strong></td>
      <td>${escapeHtml(obs.reviewerNotes || '')}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
        <title>Metrology Test Report - ${escapeHtml(reportNumber)}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
        .header-title h1 { margin: 0; font-size: 20px; color: #0f172a; text-transform: uppercase; }
        .header-title h2 { margin: 4px 0; font-size: 14px; color: #475569; font-weight: normal; }
        .header-title h3 { margin: 4px 0; font-size: 14px; color: #0f172a; font-family: monospace; }
        .qr-box { text-align: center; font-size: 10px; color: #64748b; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 15px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .field { font-size: 13px; }
        .field strong { color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
        th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; }
        .result-box { margin-top: 20px; padding: 12px; border-radius: 6px; text-align: center; font-size: 16px; font-weight: bold; }
        .pass { background-color: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .fail { background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">
          <h1>Department of Consumer Affairs — Test Report</h1>
          <h2>Legal Metrology Division — NAWI Type Evaluation</h2>
          <h3>Report Number: ${escapeHtml(reportNumber)}</h3>
        </div>
        <div class="qr-box">
          ${verificationUrl ? `<div><a href="${escapeHtml(verificationUrl)}">Verify report</a></div>` : '<div>Use the public verification portal and report number.</div>'}
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Instrument & Manufacturer Specifications</div>
        <div class="grid">
          <div class="field"><strong>Manufacturer Name:</strong> ${escapeHtml(manufacturer.name)}</div>
          <div class="field"><strong>Model Name:</strong> ${escapeHtml(model.modelName)}</div>
          <div class="field"><strong>Accuracy Class:</strong> Class ${escapeHtml(model.accuracyClass)}</div>
          <div class="field"><strong>Max Capacity:</strong> ${model.maxCapacity} kg</div>
          <div class="field"><strong>Verification Scale Interval (e):</strong> ${model.e} kg</div>
          <div class="field"><strong>Scale Intervals (n):</strong> ${model.n}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. Laboratory & Environmental Test Conditions</div>
        <div class="grid">
          <div class="field"><strong>Laboratory:</strong> ${escapeHtml(session.laboratoryName || session.labId)} (${escapeHtml(session.labId)})</div>
          <div class="field"><strong>Test Date:</strong> ${new Date(session.testDate).toISOString().split('T')[0]}</div>
          <div class="field"><strong>Temperature:</strong> ${session.environmentalConditions?.temperatureC ?? 'Not recorded'} °C</div>
          <div class="field"><strong>Humidity:</strong> ${session.environmentalConditions?.humidityPercent ?? 'Not recorded'} %</div>
          <div class="field"><strong>Inclination:</strong> ${session.environmentalConditions?.inclinationDeg ?? 'Not recorded'} °</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">3. OIML R-76 Test Observations & Compliance Determination</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Annex Ref</th>
              <th>Method</th>
              <th>Reference load (kg)</th>
              <th>Indication (kg)</th>
              <th>Zero correction (kg)</th>
              <th>Error (kg)</th>
              <th>MPE</th>
              <th>Rule edition</th>
              <th>Outcome</th>
              <th>Evidence / notes</th>
            </tr>
          </thead>
          <tbody>
            ${obsRows}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">4. Photographic Evidence & Supporting Attachments</div>
        ${
          attachments && attachments.length > 0
            ? `
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>File Name</th>
                <th>Category</th>
                <th>Upload Date</th>
              </tr>
            </thead>
            <tbody>
              ${attachments
                .map(
                  (att, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${escapeHtml(att.filename || att.originalName || 'Attachment')}</td>
                  <td>${escapeHtml(att.fileType || 'Document')}</td>
                  <td>${new Date(att.createdAt || Date.now()).toISOString().split('T')[0]}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
            : `<p style="font-size: 12px; color: #64748b; font-style: italic;">No uploaded photographic or document attachments associated with this session.</p>`
        }
      </div>

      <div class="result-box ${session.overallResult === 'pass' ? 'pass' : 'fail'}">
        OVERALL EVALUATION VERDICT: ${session.overallResult ? session.overallResult.toUpperCase() : 'PENDING'}
      </div>

      <div class="footer">
        <p>SHA-256 integrity digest with server HMAC recorded at ${escapeHtml(new Date(generatedAt).toISOString())}</p>
        <p>Report integrity tag is not a PKI-based digital signature. Applicable rule editions are listed per calculated observation.</p>
      </div>
    </body>
    </html>
  `;
}

async function renderPdf({ html, pdfPath }) {
  let browser;
  try {
    const executablePath = getBrowserExecutablePath();
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      printBackground: true,
    });
  } catch (error) {
    console.error('Puppeteer PDF generation error:', error);
    throw new AppError(500, 'PDF_RENDER_FAILED', 'PDF document rendering failed: ' + error.message);
  } finally {
    if (browser) await browser.close();
  }
}

async function renderDocx({ reportNumber, session, model, manufacturer, observations, attachments, docxPath }) {
  try {
    const tableHeaderRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: '#', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Annex Ref', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Method', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Ref Load', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Indicated', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Zero correction', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Error', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'MPE', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Rule edition', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Outcome', bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: 'Evidence / notes', bold: true })] }),
      ],
    });

    const tableObsRows = (observations || []).map(
      (obs, idx) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: String(idx + 1) })] }),
            new TableCell({ children: [new Paragraph({ text: obs.annexRef || '-' })] }),
            new TableCell({ children: [new Paragraph({ text: obs.evaluationMethod || '-' })] }),
            new TableCell({ children: [new Paragraph({ text: String(obs.referenceLoad ?? '-') })] }),
            new TableCell({ children: [new Paragraph({ text: String(obs.indicatedValue ?? '-') })] }),
            new TableCell({ children: [new Paragraph({ text: String(obs.zeroCorrection ?? '-') })] }),
            new TableCell({ children: [new Paragraph({ text: obs.computedError !== undefined ? obs.computedError.toFixed(4) : '-' })] }),
            new TableCell({ children: [new Paragraph({ text: obs.appliedMpe !== undefined ? obs.appliedMpe.toFixed(4) : '-' })] }),
            new TableCell({ children: [new Paragraph({ text: obs.ruleConfigId ? `${obs.ruleConfigId.oimlEdition} — ${obs.ruleConfigId.sourceReference || 'Source not recorded'}` : 'Checklist' })] }),
            new TableCell({ children: [new Paragraph({ text: (obs.outcome || '').toUpperCase(), bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: obs.reviewerNotes || '' })] }),
          ],
        })
    );

    const obsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [tableHeaderRow, ...tableObsRows],
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'GOVERNMENT OF INDIA - DEPARTMENT OF CONSUMER AFFAIRS',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: 'Legal Metrology Division — NAWI Type Evaluation Test Report',
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: `Report Number: ${reportNumber}`,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: '1. Instrument & Manufacturer Specifications', heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: `Manufacturer: ${manufacturer.name}` }),
            new Paragraph({ text: `Model: ${model.modelName} | Class: Class ${model.accuracyClass}` }),
            new Paragraph({ text: `Max Capacity: ${model.maxCapacity} kg | e: ${model.e} kg | n: ${model.n}` }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: '2. Laboratory & Environmental Test Conditions', heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: `Laboratory: ${session.laboratoryName || session.labId} (${session.labId})` }),
            new Paragraph({ text: `Test Date: ${new Date(session.testDate).toISOString().split('T')[0]}` }),
            new Paragraph({ text: `Temperature: ${session.environmentalConditions?.temperatureC ?? 'Not recorded'} °C | Humidity: ${session.environmentalConditions?.humidityPercent ?? 'Not recorded'} %` }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: '3. OIML R-76 Test Observations & Compliance Determination', heading: HeadingLevel.HEADING_3 }),
            obsTable,
            new Paragraph({ text: '' }),
            new Paragraph({
              text: `OVERALL EVALUATION VERDICT: ${(session.overallResult || 'PENDING').toUpperCase()}`,
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'SHA-256 digest and server HMAC integrity tag recorded for the PDF and DOCX. This is not a PKI-based digital signature.',
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: 'NAWI Digital Metrology System — applicable rule edition is recorded with each calculated observation',
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docxPath, buffer);
  } catch (err) {
    console.error('DOCX generation error:', err);
    throw new AppError(500, 'DOCX_RENDER_FAILED', 'DOCX document rendering failed: ' + err.message);
  }
}

export async function generateReport({ testSessionId, userId }) {
  const session = await TestSession.findById(testSessionId).populate({
    path: 'instrumentModelId',
    populate: { path: 'manufacturerId' },
  });

  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Test session not found');
  }

  if (session.status !== 'passed' || session.overallResult !== 'pass') {
    throw new AppError(
      409,
      'INVALID_STATE',
      'Cannot generate a report unless the session is approved and its evaluation passed'
    );
  }

  const latestReport = await Report.findOne({ testSessionId: session._id }).sort({ revisionNumber: -1 });
  if (latestReport && latestReport.status !== 'revoked') {
    throw new AppError(
      409,
      'REPORT_EXISTS',
      `Report ${latestReport.reportNumber} already exists; revoke it before generating a replacement`
    );
  }
  const revisionNumber = (latestReport?.revisionNumber || 0) + 1;

  const observations = await Observation.find({ testSessionId: session._id }).populate('ruleConfigId');
  const attachments = await Attachment.find({ testSessionId: session._id });
  const registeredModel = session.instrumentModelId;
  const model = {
    modelName: session.modelName || registeredModel.modelName,
    accuracyClass: session.accuracyClass || registeredModel.accuracyClass,
    maxCapacity: session.maxCapacity ?? registeredModel.maxCapacity,
    minCapacity: session.minCapacity ?? registeredModel.minCapacity,
    e: session.scaleInterval ?? registeredModel.e,
    n: Math.round((session.maxCapacity ?? registeredModel.maxCapacity) / (session.scaleInterval ?? registeredModel.e)),
  };
  const manufacturer = { name: session.manufacturerName || registeredModel.manufacturerId.name };

  const reportNumber = await getNextReportNumber();
  const generatedAt = new Date();

  const pdfFilename = `${reportNumber}.pdf`;
  const docxFilename = `${reportNumber}.docx`;
  const pdfPathRel = path.join('uploads', 'reports', pdfFilename);
  const docxPathRel = path.join('uploads', 'reports', docxFilename);
  const pdfPathAbs = path.join(reportsDir, pdfFilename);
  const docxPathAbs = path.join(reportsDir, docxFilename);

  const html = generateHtmlTemplate({
    reportNumber,
    session,
    model,
    manufacturer,
    observations,
    attachments,
    generatedAt,
  });

  await renderPdf({ html, pdfPath: pdfPathAbs });
  await renderDocx({ reportNumber, session, model, manufacturer, observations, attachments, docxPath: docxPathAbs });

  // Record integrity digests and server HMAC tags. These are not PKI digital signatures.
  const pdfBuffer = fs.readFileSync(pdfPathAbs);
  const contentHash = sha256(pdfBuffer);
  const hmacTag = signData(contentHash);
  const docxBuffer = fs.readFileSync(docxPathAbs);
  const docxContentHash = sha256(docxBuffer);
  const docxHmacTag = signData(docxContentHash);

  const report = await Report.create({
    testSessionId: session._id,
    revisionNumber,
    supersedesReportId: latestReport?._id || null,
    reportNumber,
    contentHash,
    docxContentHash,
    hmacTag,
    docxHmacTag,
    signatureAlgorithm: 'HMAC-SHA256',
    pdfPath: pdfPathRel.replace(/\\/g, '/'),
    docxPath: docxPathRel.replace(/\\/g, '/'),
    status: 'integrity_tagged',
    generatedBy: userId,
    generatedAt,
  });

  session.status = 'report_generated';
  await session.save();

  await appendAuditLog({
    entityType: 'Report',
    entityId: report._id,
    action: 'generate_report',
    userId,
  });

  return report;
}
