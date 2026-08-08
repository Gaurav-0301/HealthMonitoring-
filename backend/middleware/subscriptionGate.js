const User = require('../models/User');

const requireActiveMonitoring = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const allowedTiers = ['family_care', 'complete_care'];
    if (!allowedTiers.includes(user.subscriptionTier)) {
      return res.status(403).json({
        message: 'Automatic fitness band health monitoring requires a Family Care or Complete Care subscription tier.',
        currentTier: user.subscriptionTier,
        upgradeRequired: true
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error checking subscription', error: error.message });
  }
};

module.exports = { requireActiveMonitoring };
