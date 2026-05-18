const express = require('express');
const { Appointment, User, Message } = require('../models');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// Создать запись (клиент)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { psychologist_id, date } = req.body;
    const client_id = req.user.id;

    const appointment = await Appointment.create({
      client_id,
      psychologist_id,
      date,
      status: 'pending'
    });

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить записи пользователя (клиент видит свои, психолог - свои)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let appointments;
    if (userRole === 'client') {
      appointments = await Appointment.findAll({
        where: { client_id: userId },
        include: [
          { model: User, as: 'psychologist', attributes: ['id', 'name', 'specialization', 'photo_url'] }
        ],
        order: [['date', 'ASC']]
      });
    } else {
      appointments = await Appointment.findAll({
        where: { psychologist_id: userId },
        include: [
          { model: User, as: 'client', attributes: ['id', 'name'] }
        ],
        order: [['date', 'ASC']]
      });
    }

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Обновить статус (подтвердить/отменить - только психолог)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findByPk(req.params.id);

    if (!appointment) return res.status(404).json({ message: 'Запись не найдена' });

    // Проверка прав: психолог может менять статус своих записей
    if (req.user.role === 'psychologist' && appointment.psychologist_id !== req.user.id) {
      return res.status(403).json({ message: 'Нет прав' });
    }

    appointment.status = status;
    await appointment.save();

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить сообщения по сессии (appointment_id)
router.get('/:appointmentId/messages', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Сессия не найдена' });

    const messages = await Message.findAll({
      where: { appointment_id: req.params.appointmentId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
      order: [['created_at', 'ASC']]
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;