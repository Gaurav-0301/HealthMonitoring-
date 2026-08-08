// checks if user has right plan for the feature
// free tier = only manual sos and checkin
// family_care and above = auto band monitoring

function requireTier(minTier) {
  const order = ['free', 'family_care', 'complete_care'];
  return (req, res, next) => {
    const userTier = req.user.subscriptionTier || 'free';
    if (order.indexOf(userTier) < order.indexOf(minTier)) {
      return res.status(403).json({ msg: 'upgrade your plan to use this feature' });
    }
    next();
  };
}

module.exports = requireTier;
