const { supabase } = require('../config/supabase');
const {
  getLatestActiveSubscriptionForUser,
  refreshSubscriptionAutoRenewalForUser
} = require('../services/subscriptionService');

const syncSubscription = async (req, res) => {
  try {
    const activeSub = await getLatestActiveSubscriptionForUser(req.user.id) || await refreshSubscriptionAutoRenewalForUser(req.user.id);
    const isPremium = !!activeSub;
    const isVip = isPremium && ['BIANNUAL', 'ANNUAL', 'PRESTIGE'].includes(String(activeSub?.plan_id || '').toUpperCase());

    if (req.user.is_premium !== isPremium || req.user.is_vip !== isVip) {
      await supabase
        .from('profiles')
        .update({ is_premium: isPremium, is_vip: isVip })
        .eq('id', req.user.id);
    }

    res.json({
      active: isPremium,
      plan_id: activeSub?.plan_id || null,
      current_period_end: activeSub?.current_period_end || null,
      auto_renewing: typeof activeSub?.auto_renewing === 'boolean' ? activeSub.auto_renewing : null,
    });
  } catch (e) {
    res.status(500).json({ error: 'subscription_sync_failed' });
  }
};

module.exports = { syncSubscription };
