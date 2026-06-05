// Creates (or updates) a default admin user. Usage: npm run seed:admin
require('dotenv').config();
const { sequelize, User } = require('../src/models');
const logger = require('../src/utils/logger');

const ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

async function run() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    let user = await User.findOne({ where: { username: ADMIN.username } });
    if (!user) {
      user = User.build({ username: ADMIN.username, email: ADMIN.email, role: 'admin' });
    }
    await user.setPassword(ADMIN.password);
    user.role = 'admin';
    await user.save();

    logger.info(`Admin ready -> username: ${ADMIN.username}, password: ${ADMIN.password}`);
    process.exit(0);
  } catch (err) {
    logger.error('Failed to create admin:', err.message);
    process.exit(1);
  }
}

run();
