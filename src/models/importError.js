module.exports = (sequelize, DataTypes) => {
  const ImportError = sequelize.define(
    'ImportError',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      rowNumber: { type: DataTypes.INTEGER, allowNull: true },
      rawData: { type: DataTypes.JSONB, allowNull: true }, // original row, used for re-import
      errorMessage: { type: DataTypes.TEXT, allowNull: false },
      resolved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'import_errors' }
  );

  return ImportError;
};
