module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      action: { type: DataTypes.STRING, allowNull: false }, // LOGIN, UPLOAD, IMPORT, REIMPORT, ...
      entityType: { type: DataTypes.STRING, allowNull: true }, // PoDocument, ImportJob, ...
      entityId: { type: DataTypes.INTEGER, allowNull: true },
      details: { type: DataTypes.JSONB, allowNull: true },
      ipAddress: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: 'audit_logs', updatedAt: false }
  );

  return AuditLog;
};
