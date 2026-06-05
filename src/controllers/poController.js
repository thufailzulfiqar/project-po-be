const { PoDocument, PoItem } = require('../models');

// GET /api/po  — list PO documents
async function listDocuments(req, res, next) {
  try {
    const documents = await PoDocument.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    return res.json({ documents });
  } catch (err) {
    return next(err);
  }
}

// GET /api/po/:id  — one document with its items
async function getDocument(req, res, next) {
  try {
    const document = await PoDocument.findByPk(req.params.id, {
      include: [{ model: PoItem, as: 'items' }],
    });
    if (!document) return res.status(404).json({ message: 'PO document not found' });
    return res.json({ document });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listDocuments, getDocument };
