module.exports = (sequelize, DataTypes) => {
  const PoItem = sequelize.define(
    'PoItem',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      lineNo: { type: DataTypes.INTEGER, allowNull: true }, // NO column
      uniqNo: { type: DataTypes.STRING, allowNull: false }, // B015MT
      partNo: { type: DataTypes.STRING, allowNull: false }, // SAPH440 (2.0 x 286)
      partName: { type: DataTypes.STRING, allowNull: true }, // COIL ADJUSTER LOWER ARM RH/LH
      kanban: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      qtyPerKanban: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      totalQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      note: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: 'po_items' }
  );

  return PoItem;
};
