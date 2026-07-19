const { db } = require('../config/firebase');
const {
  getLatestActiveSubscriptionForUser,
  refreshSubscriptionAutoRenewalForUser
} = require('../services/subscriptionService');

const syncSubscription = async (req, res) => {
  try {
    const activeSub = await getLatestActiveSubscriptionForUser(req.user.id) || await refreshSubscriptionAutoRenewalForUser(req.user.id);
    const is_premium = !!activeSub;
    const is_vip = is_premium && ['BIANNUAL', 'ANNUAL', 'PRESTIGE'].includes(String(activeSub?.plan_id || '').toUpperCase());

    if (req.user.is_premium !== is_premium || req.user.is_vip !== is_vip) {
      await db.collection('profiles').doc(req.user.id).update({
        is_premium: is_premium,
        is_vip: is_vip
      });
    }

    res.json({
      active: is_premium,
      plan_id: activeSub?.plan_id || null,
      current_period_end: activeSub?.current_period_end || null,
      auto_renewing: typeof activeSub?.auto_renewing === 'boolean' ? activeSub.auto_renewing : null,
    });
  } catch (e) {
    res.status(500).json({ error: 'subscription_sync_failed' });
  }
};

module.exports = { syncSubscription };
