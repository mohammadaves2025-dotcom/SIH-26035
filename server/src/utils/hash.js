import crypto from 'crypto';

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function signData(data, secret = process.env.JWT_SECRET || 'nawi-digital-metrology-secret-key') {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function verifySignature(data, signature, secret = process.env.JWT_SECRET || 'nawi-digital-metrology-secret-key') {
  const expected = signData(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
