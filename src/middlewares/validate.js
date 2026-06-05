const { validationResult } = require('express-validator');

/**
 * Runs after express-validator rule chains. Returns 422 with the collected
 * errors if any rule failed.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() });
  }
  return next();
}

module.exports = validate;
