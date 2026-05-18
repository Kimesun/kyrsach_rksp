const express = require('express');
const { getAllPsychologists, getPsychologistById } = require('../controllers/psychologistController');
const router = express.Router();

router.get('/', getAllPsychologists);
router.get('/:id', getPsychologistById);

module.exports = router;