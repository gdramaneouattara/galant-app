const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getRideEstimate, getFoodPartners } = require('../services/yangoService');

router.get('/ride-estimate', requireAuth, async (req, res) => {
  const { startLat, startLon, endLat, endLon } = req.query;
  const data = await getRideEstimate(startLat, startLon, endLat, endLon);
  res.json(data);
});

router.get('/food-nearby', requireAuth, async (req, res) => {
  const { lat, lon } = req.query;
  const data = await getFoodPartners(lat, lon);
  res.json(data);
});

module.exports = router;
