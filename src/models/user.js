const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: DataTypes.STRING, allowNull: false, unique: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.ENUM('admin', 'user'), allowNull: false, defaultValue: 'user' },
    },
    { tableName: 'users' }
  );

  // Helper: set password (hashes automatically)
  User.prototype.setPassword = async function (plain) {
    this.passwordHash = await bcrypt.hash(plain, 10);
  };

  User.prototype.validatePassword = function (plain) {
    return bcrypt.compare(plain, this.passwordHash);
  };

  // Never leak the hash in JSON responses
  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  };

  return User;
};
