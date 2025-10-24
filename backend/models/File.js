const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  fileCategory: { type: String, enum: ['handwriting_sample', 'assignment'], required: true },
  fileName: { type: String, required: true },
  fileData: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  marks: { type: String, default: null }, // <-- ADD THIS LINE
});

module.exports = mongoose.model('File', fileSchema);
