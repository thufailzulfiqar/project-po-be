const express = require('express');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('username').isString().trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [body('username').isString().notEmpty(), body('password').notEmpty()],
  validate,
  authController.login
);

router.get('/me', authenticate, authController.me);

module.exports = router;
