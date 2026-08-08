const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
  elderProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElderProfile' },
  conditions: [String], // diabetes, bp, heart disease etc
  medications: [
    {
      name: String,
      dosage: String,
      prescriptionPhotoUrl: String
    }
  ],
  allergies: [String],
  bloodGroup: String,
  doctorName: String,
  doctorContact: String,
  pastSurgeries: [String],
  documentsUploaded: [String]
});

module.exports = mongoose.model('MedicalHistory', medicalHistorySchema);
