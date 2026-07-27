const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { searchProducts, getTrends } = require('../controllers/marketController');

router.get('/search', requireAuth, searchProducts);
router.get('/trends', requireAuth, getTrends);

module.exports = router;
