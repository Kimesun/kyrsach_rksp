const { User } = require('../models');

const getAllPsychologists = async (req, res) => {
  try {
    const psychologists = await User.findAll({
      where: { role: 'psychologist' },
      attributes: ['id', 'name', 'specialization', 'price', 'description', 'photo_url', 'rating']
    });
    res.json(psychologists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPsychologistById = async (req, res) => {
  try {
    const psychologist = await User.findOne({
      where: { id: req.params.id, role: 'psychologist' },
      attributes: ['id', 'name', 'specialization', 'price', 'description', 'photo_url', 'rating']
    });
    if (!psychologist) return res.status(404).json({ message: 'Psychologist not found' });
    res.json(psychologist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllPsychologists, getPsychologistById };