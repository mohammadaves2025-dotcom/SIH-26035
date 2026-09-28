import { createServer } from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getCertificateFingerprint, signReportDigest, verifyDetachedSignature } from '../src/services/digitalSignature.service.js';

describe('External PKI report signer adapter', () => {
  let tempDir;
  let privateKey;
  let certificatePem;
  let certificateFingerprint;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nawi-pki-test-'));
    const keyPath = path.join(tempDir, 'test-private.pem');
    const certPath = path.join(tempDir, 'test-certificate.pem');
    execFileSync('C:\\Program Files\\Git\\usr\\bin\\openssl.exe', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath,
      '-out', certPath, '-subj', '/CN=NAWI Test Signer', '-days', '2',
    ], { stdio: 'ignore' });
    privateKey = fs.readFileSync(keyPath, 'utf8');
    certificatePem = fs.readFileSync(certPath, 'utf8');
    certificateFingerprint = getCertificateFingerprint(certificatePem);
  });

  afterAll(() => {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('obtains an RSA signature from the isolated service and validates it against a pinned certificate', async () => {
    const server = createServer(async (request, response) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (request.headers.authorization !== 'Bearer unit-test-token') {
        response.writeHead(401).end();
        return;
      }
      const signature = crypto.sign('RSA-SHA256', Buffer.from(body.digest, 'hex'), privateKey).toString('base64');
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ signature, algorithm: 'RSA-SHA256', keyId: 'test-key', signedAt: new Date().toISOString() }));
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const digest = crypto.createHash('sha256').update('report bytes').digest('hex');
      const signed = await signReportDigest(digest, {
        serviceUrl: `http://127.0.0.1:${server.address().port}/sign`,
        serviceToken: 'unit-test-token',
        keyId: 'test-key',
        certificatePem,
        trustedFingerprints: [certificateFingerprint],
      });

      expect(signed.algorithm).toBe('RSA-SHA256');
      expect(signed.certificateFingerprint).toBe(certificateFingerprint);
      expect(verifyDetachedSignature(digest, signed.signature, signed.certificatePem, signed.signedAt, [certificateFingerprint])).toBe(true);
      expect(verifyDetachedSignature('0'.repeat(64), signed.signature, signed.certificatePem, signed.signedAt, [certificateFingerprint])).toBe(false);
      expect(verifyDetachedSignature(digest, signed.signature, signed.certificatePem, signed.signedAt, ['00'])).toBe(false);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
