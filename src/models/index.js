const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Register models
const User = require('./user')(sequelize, DataTypes);
const PoDocument = require('./poDocument')(sequelize, DataTypes);
const PoItem = require('./poItem')(sequelize, DataTypes);
const ImportJob = require('./importJob')(sequelize, DataTypes);
const ImportError = require('./importError')(sequelize, DataTypes);
const AuditLog = require('./auditLog')(sequelize, DataTypes);

// ---- Associations ----

// An import job is uploaded by a user
ImportJob.belongsTo(User, { as: 'uploader', foreignKey: 'uploadedBy' });
User.hasMany(ImportJob, { as: 'imports', foreignKey: 'uploadedBy' });

// A PO document is created from an import job and by a user
PoDocument.belongsTo(ImportJob, { as: 'importJob', foreignKey: 'importJobId' });
ImportJob.hasMany(PoDocument, { as: 'documents', foreignKey: 'importJobId' });
PoDocument.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

// PO document <-> items
PoDocument.hasMany(PoItem, { as: 'items', foreignKey: 'poDocumentId', onDelete: 'CASCADE' });
PoItem.belongsTo(PoDocument, { as: 'document', foreignKey: 'poDocumentId' });

// Import errors belong to an import job
ImportError.belongsTo(ImportJob, { as: 'importJob', foreignKey: 'importJobId' });
ImportJob.hasMany(ImportError, { as: 'errors', foreignKey: 'importJobId' });

// Audit logs belong to a user
AuditLog.belongsTo(User, { as: 'user', foreignKey: 'userId' });

const db = {
  sequelize,
  User,
  PoDocument,
  PoItem,
  ImportJob,
  ImportError,
  AuditLog,
};

module.exports = db;
