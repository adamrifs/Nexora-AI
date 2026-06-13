const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'ai'], required: true },
  content: { type: String, required: true }
}, { timestamps: true });

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName:      { type: String, required: true },
  fileType:      { type: String, required: true }, // pdf | docx | pptx | xlsx | csv
  fileSize:      { type: Number },
  title:         { type: String, default: 'Document Analysis' },
  extractedText: { type: String },  // stored for Q&A context (up to 50k chars)
  analysis:      { type: String },  // the AI-generated report (markdown)
  chatHistory:   [chatMessageSchema] // follow-up Q&A messages
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
