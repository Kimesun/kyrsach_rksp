const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize, User, Appointment, Message } = require('./models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const { body, validationResult } = require('express-validator');

dotenv.config();

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// ========== Middleware для JWT ==========
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Нет токена' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Неверный токен' });
  }
};

// ========== ВАЛИДАЦИЯ ДЛЯ РЕГИСТРАЦИИ ==========
app.post('/api/auth/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Имя должно быть от 2 до 100 символов')
    .matches(/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/)
    .withMessage('Имя может содержать только буквы, пробелы и дефисы'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Некорректный email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 4, max: 100 })
    .withMessage('Пароль должен быть от 4 до 100 символов'),
  
  body('role')
    .optional()
    .isIn(['client', 'psychologist'])
    .withMessage('Роль может быть только "client" или "psychologist"')
], async (req, res) => {
  // Проверка результатов валидации
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Ошибка валидации', 
      errors: errors.array() 
    });
  }
  
  try {
    const { name, email, password, role, specialization, price, description } = req.body;
    
    // Дополнительная проверка на длину полей (защита от слишком длинных строк)
    if (specialization && specialization.length > 255) {
      return res.status(400).json({ message: 'Специализация не может быть длиннее 255 символов' });
    }
    if (description && description.length > 1000) {
      return res.status(400).json({ message: 'Описание не может быть длиннее 1000 символов' });
    }
    if (price && (isNaN(price) || price < 0 || price > 10000)) {
      return res.status(400).json({ message: 'Цена должна быть числом от 0 до 10000' });
    }
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = { 
      name: name.trim(), 
      email: email.toLowerCase(), 
      password: hashedPassword, 
      role: role || 'client' 
    };
    
    if (role === 'psychologist') {
      userData.specialization = specialization?.substring(0, 255) || null;
      userData.price = price ? parseFloat(price) : null;
      userData.description = description?.substring(0, 1000) || null;
    }
    
    const user = await User.create(userData);
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    // Обработка ошибок БД
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ message: 'Некорректные данные: ' + (err.errors?.[0]?.message || err.message) });
    }
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// ========== РОУТЫ ЛОГИНА ==========
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========== РОУТЫ ПСИХОЛОГОВ ==========
app.get('/api/psychologists', async (req, res) => {
  try {
    const psychologists = await User.findAll({
      where: { role: 'psychologist' },
      attributes: ['id', 'name', 'specialization', 'price', 'description', 'photo_url', 'rating']
    });
    res.json(psychologists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/psychologists/:id', async (req, res) => {
  try {
    const psychologist = await User.findOne({
      where: { id: req.params.id, role: 'psychologist' },
      attributes: ['id', 'name', 'specialization', 'price', 'description', 'photo_url', 'rating']
    });
    if (!psychologist) return res.status(404).json({ message: 'Психолог не найден' });
    res.json(psychologist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========== РОУТЫ ЗАПИСЕЙ ==========
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { psychologist_id, date } = req.body;
    const appointment = await Appointment.create({
      client_id: req.user.id,
      psychologist_id,
      date,
      status: 'pending'
    });
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/appointments/my', authenticateToken, async (req, res) => {
  try {
    let appointments;
    if (req.user.role === 'client') {
      appointments = await Appointment.findAll({
        where: { client_id: req.user.id },
        include: [{ model: User, as: 'psychologist', attributes: ['id', 'name', 'specialization'] }],
        order: [['date', 'ASC']]
      });
    } else {
      appointments = await Appointment.findAll({
        where: { psychologist_id: req.user.id },
        include: [{ model: User, as: 'client', attributes: ['id', 'name'] }],
        order: [['date', 'ASC']]
      });
    }
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/appointments/:id/status', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Запись не найдена' });
    if (req.user.role === 'psychologist' && appointment.psychologist_id !== req.user.id) {
      return res.status(403).json({ message: 'Нет прав' });
    }
    appointment.status = req.body.status;
    await appointment.save();
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========== РОУТЫ СООБЩЕНИЙ ==========
app.get('/api/messages/:appointmentId', authenticateToken, async (req, res) => {
  try {
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

app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { appointment_id, message } = req.body;
    const msg = await Message.create({
      appointment_id,
      from_user_id: req.user.id,
      message,
      is_read: false
    });
    const msgWithSender = await Message.findByPk(msg.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }]
    });
    res.status(201).json(msgWithSender);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ========== РОУТЫ УПРАВЛЕНИЯ СЕССИЯМИ ==========

// Завершить сессию (клиент или психолог)
app.put('/api/appointments/:id/complete', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }
    
    // Проверяем, что пользователь участвует в сессии
    if (appointment.client_id !== req.user.id && appointment.psychologist_id !== req.user.id) {
      return res.status(403).json({ message: 'Нет прав на завершение этой сессии' });
    }
    
    // Нельзя завершить уже завершённую или отменённую
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Сессия уже завершена или отменена' });
    }
    
    appointment.status = 'completed';
    await appointment.save();
    
    res.json({ message: 'Сессия завершена', appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Удалить сессию (только для психолога или админа)
app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }
    
    // Только психолог или админ может удалить (для простоты — психолог)
    if (req.user.role !== 'psychologist' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Только психолог может удалить сессию' });
    }
    
    // Проверяем, что сессия принадлежит этому психологу
    if (appointment.psychologist_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Это не ваша сессия' });
    }
    
    await appointment.destroy();
    res.json({ message: 'Сессия удалена' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Поставить рейтинг психологу (только клиент после завершённой сессии)
app.post('/api/ratings/:psychologistId', authenticateToken, async (req, res) => {
  try {
    const { rating } = req.body;
    const psychologistId = parseInt(req.params.psychologistId);
    const clientId = req.user.id;
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Рейтинг должен быть от 1 до 5' });
    }
    
    // Проверяем, была ли завершённая сессия у этого клиента с этим психологом
    const completedSession = await Appointment.findOne({
      where: {
        client_id: clientId,
        psychologist_id: psychologistId,
        status: 'completed'
      }
    });
    
    if (!completedSession) {
      return res.status(403).json({ message: 'Вы можете оценить психолога только после завершённой сессии' });
    }
    
    // Проверяем, не ставил ли уже рейтинг
    if (completedSession.rating_given) {
      return res.status(400).json({ message: 'Вы уже оценили этого психолога' });
    }
    
    // Обновляем рейтинг психолога (среднее арифметическое)
    const psychologist = await User.findByPk(psychologistId);
    const oldRating = parseFloat(psychologist.rating) || 0;
    const ratingsCount = await Appointment.count({
      where: {
        psychologist_id: psychologistId,
        rating_given: true
      }
    });
    
    const newRating = (oldRating * ratingsCount + rating) / (ratingsCount + 1);
    psychologist.rating = Math.round(newRating * 10) / 10;
    await psychologist.save();
    
    // Отмечаем, что рейтинг поставлен
    completedSession.rating_given = true;
    await completedSession.save();
    
    res.json({ message: 'Спасибо за оценку!', newRating: psychologist.rating });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========== WEBSOCKET СЕРВЕР ==========
const wss = new WebSocketServer({ server });
const clients = new Map(); // userId -> ws

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    console.log('❌ WebSocket: нет токена');
    ws.close();
    return;
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    const userId = decoded.id;
    
    clients.set(userId, ws);
    console.log(`✅ WebSocket: пользователь ${userId} подключился (всего клиентов: ${clients.size})`);
    
    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        console.log(`📨 WebSocket: сообщение от ${userId}:`, parsed);
        
        if (parsed.type === 'join') {
          console.log(`🔗 WebSocket: пользователь ${userId} присоединился к чату ${parsed.appointment_id}`);
        }
        else if (parsed.type === 'chat') {
          const { appointment_id, message } = parsed;
          
          // Сохраняем в БД
          const newMessage = await Message.create({
            appointment_id,
            from_user_id: userId,
            message,
            is_read: false
          });
          
          // Получаем информацию об отправителе
          const sender = await User.findByPk(userId, { attributes: ['id', 'name'] });
          
          // Получаем информацию о сессии
          const appointment = await Appointment.findByPk(appointment_id);
          if (!appointment) {
            console.log(`❌ WebSocket: сессия ${appointment_id} не найдена`);
            return;
          }
          
          // Определяем получателя
          const receiverId = appointment.client_id === userId ? appointment.psychologist_id : appointment.client_id;
          
          const messageData = JSON.stringify({
            type: 'chat',
            id: newMessage.id,
            message: message,
            from_user_id: userId,
            senderName: sender.name,
            created_at: newMessage.created_at,
            appointment_id: appointment_id
          });
          
          // Отправляем получателю
          const receiverWs = clients.get(receiverId);
          if (receiverWs && receiverWs.readyState === 1) {
            receiverWs.send(messageData);
            console.log(`📤 WebSocket: сообщение отправлено пользователю ${receiverId}`);
          } else {
            console.log(`⚠️ WebSocket: пользователь ${receiverId} не в сети`);
          }
          
          // Отправляем отправителю подтверждение
          ws.send(messageData);
          console.log(`📤 WebSocket: подтверждение отправлено пользователю ${userId}`);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
    
    ws.on('close', () => {
      console.log(`❌ WebSocket: пользователь ${userId} отключился`);
      clients.delete(userId);
    });
    
  } catch (err) {
    console.error('WebSocket auth error:', err);
    ws.close();
  }
});

// ========== ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК ==========
// Должен быть в конце, перед запуском сервера
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  
  // Не показываем внутренние ошибки клиенту
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: 'Ошибка валидации данных' });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ message: 'Такой email уже зарегистрирован' });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ message: 'Ссылка на несуществующий объект' });
  }
  
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true })
  .then(async () => {
    console.log('✅ База данных подключена');
    const count = await User.count({ where: { role: 'psychologist' } });
    if (count === 0) {
      await User.create({
        name: 'Анна Иванова',
        email: 'anna@psychologist.com',
        password: await bcrypt.hash('123456', 10),
        role: 'psychologist',
        specialization: 'Семейный психолог',
        price: 2500,
        description: 'Опытный психолог с 10-летним стажем'
      });
      console.log('✅ Тестовый психолог создан: anna@psychologist.com / 123456');
    }
    server.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));
  })
  .catch(err => console.error('❌ Ошибка БД:', err));