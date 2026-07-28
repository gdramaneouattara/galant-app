const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { searchProducts, getTrends, clearMarketCache } = require('../controllers/marketController');

router.get('/search', requireAuth, searchProducts);
router.get('/trends', requireAuth, getTrends);
router.post('/clear-cache', requireAuth, clearMarketCache);

module.exports = router;
