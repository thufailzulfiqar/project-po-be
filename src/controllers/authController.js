const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const auditService = require('../services/auditService');

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { username, email, password, role } = req.body;

    const exists = await User.findOne({ where: { username } });
    if (exists) return res.status(409).json({ message: 'Username already taken' });

    const user = User.build({ username, email, role: role === 'admin' ? 'admin' : 'user' });
    await user.setPassword(password);
    await user.save();

    await auditService.log({
      userId: user.id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await auditService.log({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return res.json({ user, token: signToken(user) });
  } catch (err) {
    return next(err);
  }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, me };
