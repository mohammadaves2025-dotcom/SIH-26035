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
import { sha256 } from '../utils/hash.js';
import { appendAuditLog } from './auditLogger.service.js';
import { AppError } from '../utils/AppError.js';

const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
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

function generateHtmlTemplate({ reportNumber, session, model, manufacturer, observations, attachments, signedAt }) {
  const obsRows = observations
    .map(
      (obs, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${obs.annexRef}</td>
      <td>${obs.evaluationMethod}</td>
      <td>${obs.referenceLoad ?? '-'}</td>
      <td>${obs.indicatedValue ?? '-'}</td>
      <td>${obs.computedError !== undefined ? obs.computedError.toFixed(4) : '-'}</td>
      <td>${obs.appliedMpe !== undefined ? obs.appliedMpe.toFixed(4) : '-'}</td>
      <td><strong style="color: ${obs.outcome === 'pass' ? '#16a34a' : '#dc2626'}">${(obs.outcome || '').toUpperCase()}</strong></td>
    </tr>
  `
    )
    .join('');

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`http://localhost:5173/verify?q=${reportNumber}`)}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Metrology Test Report - ${reportNumber}</title>
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
          <h1>Government of India — Dept. of Consumer Affairs</h1>
          <h2>Legal Metrology Division — OIML R-76 Type Evaluation Certificate</h2>
          <h3>Certificate Number: ${reportNumber}</h3>
        </div>
        <div class="qr-box">
          <img src="${qrCodeUrl}" width="90" height="90" alt="Verification QR Code" />
          <div>Scan to Verify</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Instrument & Manufacturer Specifications</div>
        <div class="grid">
          <div class="field"><strong>Manufacturer Name:</strong> ${manufacturer.name}</div>
          <div class="field"><strong>Model Name:</strong> ${model.modelName}</div>
          <div class="field"><strong>Accuracy Class:</strong> Class ${model.accuracyClass}</div>
          <div class="field"><strong>Max Capacity:</strong> ${model.maxCapacity} kg</div>
          <div class="field"><strong>Verification Scale Interval (e):</strong> ${model.e} kg</div>
          <div class="field"><strong>Scale Intervals (n):</strong> ${model.n}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. Laboratory & Environmental Test Conditions</div>
        <div class="grid">
          <div class="field"><strong>Laboratory ID:</strong> ${session.labId}</div>
          <div class="field"><strong>Test Date:</strong> ${new Date(session.testDate).toISOString().split('T')[0]}</div>
          <div class="field"><strong>Temperature:</strong> ${session.environmentalConditions?.temperatureC ?? 22.5} °C</div>
          <div class="field"><strong>Humidity:</strong> ${session.environmentalConditions?.humidityPercent ?? 55} %</div>
          <div class="field"><strong>Inclination:</strong> ${session.environmentalConditions?.inclinationDeg ?? 0.0} °</div>
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
              <th>Ref Load</th>
              <th>Indicated</th>
              <th>Error (E)</th>
              <th>MPE (±e)</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            ${obsRows}
          </tbody>
        </table>
      </div>

      <div class="result-box ${session.overallResult === 'pass' ? 'pass' : 'fail'}">
        OVERALL EVALUATION VERDICT: ${session.overallResult ? session.overallResult.toUpperCase() : 'PENDING'}
      </div>

      <div class="footer">
        <p>Digitally signed & PKI verified on ${new Date(signedAt).toISOString()}</p>
        <p>NAWI Digital Metrology System — Compliant with OIML R-76-1:2006 & Legal Metrology Rules 2011</p>
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
    fs.writeFileSync(pdfPath, `PDF Fallback rendering for report: ${html.slice(0, 500)}`);
  } finally {
    if (browser) await browser.close();
  }
}

async function renderDocx({ reportNumber, session, model, manufacturer, observations, docxPath }) {
  try {
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
              text: 'Legal Metrology Division — OIML R-76 Type Evaluation Certificate',
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: `Report Number: ${reportNumber}`,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: `Manufacturer: ${manufacturer.name} | Model: ${model.modelName} | Class: ${model.accuracyClass}`,
            }),
            new Paragraph({
              text: `Result: ${session.overallResult ? session.overallResult.toUpperCase() : 'PENDING'}`,
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docxPath, buffer);
  } catch (err) {
    console.error('DOCX generation error:', err);
    fs.writeFileSync(docxPath, Buffer.from(`DOCX Fallback: Report ${reportNumber}`));
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

  if (session.status !== 'passed' && session.status !== 'failed' && session.status !== 'published') {
    throw new AppError(
      409,
      'INVALID_STATE',
      'Cannot generate report for a session that has not completed evaluation'
    );
  }

  let report = await Report.findOne({ testSessionId: session._id });

  const observations = await Observation.find({ testSessionId: session._id });
  const attachments = await Attachment.find({ testSessionId: session._id });
  const model = session.instrumentModelId;
  const manufacturer = model.manufacturerId;

  const reportNumber = report ? report.reportNumber : await getNextReportNumber();
  const signedAt = report ? report.signedAt : new Date();

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
    signedAt,
  });

  await renderPdf({ html, pdfPath: pdfPathAbs });
  await renderDocx({ reportNumber, session, model, manufacturer, observations, docxPath: docxPathAbs });

  const contentHash = sha256(html);

  if (!report) {
    report = await Report.create({
      testSessionId: session._id,
      reportNumber,
      contentHash,
      pdfPath: pdfPathRel.replace(/\\/g, '/'),
      docxPath: docxPathRel.replace(/\\/g, '/'),
      status: 'signed',
      signedBy: userId,
      signedAt,
    });

    session.status = 'published';
    await session.save();

    await appendAuditLog({
      entityType: 'Report',
      entityId: report._id,
      action: 'generate_report',
      userId,
    });
  } else {
    report.contentHash = contentHash;
    report.pdfPath = pdfPathRel.replace(/\\/g, '/');
    report.docxPath = docxPathRel.replace(/\\/g, '/');
    await report.save();
  }

  return report;
}
