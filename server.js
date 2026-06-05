const app = require('./src/app');
const config = require('./src/config');
const { sequelize } = require('./src/models');
const logger = require('./src/utils/logger');

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Dev convenience: sync models. In production prefer migrations.
    if (config.env === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Models synced');
    }

    app.listen(config.port, () => {
      logger.info(`Server running at http://localhost:${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
