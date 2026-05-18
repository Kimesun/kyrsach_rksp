const express = require('express');
const router = express.Router();

// Временная заглушка
router.get('/history/:userId', (req, res) => {
  res.json([]);
});

module.exports = router;