const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: 'user already exist' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({ name, email, phone, passwordHash, role });
    await user.save();

    res.json({ msg: 'signup done', userId: user._id });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'invalid creds' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ msg: 'invalid creds' });

    const token = jwt.sign(
      { id: user._id, role: user.role, subscriptionTier: user.subscriptionTier },
      process.env.JWT_SECRET || 'secretkey123',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'server error' });
  }
});

module.exports = router;
