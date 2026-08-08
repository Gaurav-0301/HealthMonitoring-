const express = require('express');
const router = express.Router();
const multer = require('multer');
const ElderProfile = require('../models/ElderProfile');
const MedicalHistory = require('../models/MedicalHistory');
const auth = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

// create elder profile
router.post('/', auth, async (req, res) => {
  try {
    const profile = new ElderProfile({
      ...req.body,
      linkedFamilyUserId: req.user.id
    });
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'could not create profile' });
  }
});

// get all elders for logged in family user
router.get('/', auth, async (req, res) => {
  const profiles = await ElderProfile.find({ linkedFamilyUserId: req.user.id });
  res.json(profiles);
});

// add medical history - supports photo upload for prescriptions
router.post('/:id/medical-history', auth, upload.array('documents', 5), async (req, res) => {
  try {
    const docUrls = (req.files || []).map(f => f.path);

    const history = new MedicalHistory({
      elderProfileId: req.params.id,
      conditions: req.body.conditions ? req.body.conditions.split(',') : [],
      allergies: req.body.allergies ? req.body.allergies.split(',') : [],
      bloodGroup: req.body.bloodGroup,
      doctorName: req.body.doctorName,
      doctorContact: req.body.doctorContact,
      documentsUploaded: docUrls
    });

    await history.save();
    res.json(history);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'could not save medical history, try again' });
  }
});

module.exports = router;
