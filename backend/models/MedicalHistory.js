const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  prescriptionPhotoUrl: { type: String, default: '' }
});

const medicalHistorySchema = new mongoose.Schema({
  elderProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ElderProfile',
    required: true,
    unique: true
  },
  conditions: [{ type: String }],
  medications: [medicationSchema],
  allergies: [{ type: String }],
  bloodGroup: { type: String, default: 'Unknown' },
  doctorName: { type: String, default: '' },
  doctorContact: { type: String, default: '' },
  pastSurgeries: [{ type: String }],
  documentsUploaded: [{ type: String }],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MedicalHistory', medicalHistorySchema);
