import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL ERROR: Environment variable ${envVar} is missing.`);
    process.exit(1);
  }
}

const insecureDefaults = new Set([
  'supersecretkey',
  'integritysecret',
  'example_secret',
  'your_jwt_secret_key_min_32_chars',
  'change_this_secret',
  'secret',
  '12345678901234567890123456789012',
]);

if (process.env.NODE_ENV === 'production') {
  if (!process.env.REPORT_INTEGRITY_SECRET) {
    console.error('FATAL ERROR: REPORT_INTEGRITY_SECRET is required in production.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || insecureDefaults.has(process.env.JWT_SECRET.trim())) {
    console.error('FATAL ERROR: JWT_SECRET must be at least 32 characters and cannot use default example values in production.');
    process.exit(1);
  }
  if (process.env.REPORT_INTEGRITY_SECRET.length < 32 || insecureDefaults.has(process.env.REPORT_INTEGRITY_SECRET.trim())) {
    console.error('FATAL ERROR: REPORT_INTEGRITY_SECRET must be at least 32 characters and cannot use default example values in production.');
    process.exit(1);
  }
}

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  REPORT_INTEGRITY_SECRET: process.env.REPORT_INTEGRITY_SECRET || null,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
};
