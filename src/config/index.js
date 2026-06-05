require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'po_db',
    user: process.env.DB_USER || 'postgres',
    pass: process.env.DB_PASS || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'insecure_default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  },
};

module.exports = config;
