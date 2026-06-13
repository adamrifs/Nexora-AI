const express = require('express');
const router  = express.Router();
const {
  uploadMiddleware,
  analyzeDocument,
  askAboutDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
} = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

// Analyze a new document (file upload + SSE stream)
router.post('/analyze', protect, uploadMiddleware, analyzeDocument);

// Q&A about a saved document (SSE stream)
router.post('/:id/question', protect, askAboutDocument);

// List all documents for the user
router.get('/', protect, getDocuments);

// Get a single document with full analysis + Q&A history
router.get('/:id', protect, getDocumentById);

// Delete a document
router.delete('/:id', protect, deleteDocument);

module.exports = router;
