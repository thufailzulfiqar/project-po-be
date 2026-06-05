// Minimal logger wrapper. Swap for winston/pino later if needed.
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') console.debug('[DEBUG]', ...args);
  },
};

module.exports = logger;
