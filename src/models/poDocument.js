module.exports = (sequelize, DataTypes) => {
  const PoDocument = sequelize.define(
    'PoDocument',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dnNo: { type: DataTypes.STRING, allowNull: false, unique: true }, // 01SCI-ID-25-112-7-14-1
      poNo: { type: DataTypes.STRING, allowNull: false }, // ID-25-112
      deliveryDate: { type: DataTypes.DATEONLY, allowNull: true },
      arrivalTime: { type: DataTypes.STRING, allowNull: true }, // "13.00 WIB"
      cycleIssue: { type: DataTypes.STRING, allowNull: true }, // "1-1-4"
      cycle: { type: DataTypes.STRING, allowNull: true }, // "CYCLE 1"
      supplierCode: { type: DataTypes.STRING, allowNull: true }, // 01SCI
      supplierName: { type: DataTypes.STRING, allowNull: true },
      deliveryTo: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'po_documents' }
  );

  return PoDocument;
};
