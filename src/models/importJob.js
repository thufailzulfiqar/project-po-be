module.exports = (sequelize, DataTypes) => {
  const ImportJob = sequelize.define(
    'ImportJob',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      originalName: { type: DataTypes.STRING, allowNull: false },
      storedPath: { type: DataTypes.STRING, allowNull: false },
      fileType: { type: DataTypes.ENUM('excel', 'pdf'), allowNull: false },
      status: {
        type: DataTypes.ENUM('pending', 'success', 'partial', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      totalRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      successRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      failedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      errorSummary: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'import_jobs' }
  );

  return ImportJob;
};
