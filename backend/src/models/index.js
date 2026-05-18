const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'psychologist_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { 
    type: DataTypes.STRING(100),  // ограничили до 100 символов
    allowNull: false,
    validate: { len: [2, 100] }
  },
  email: { 
    type: DataTypes.STRING(100), 
    allowNull: false, 
    unique: true,
    validate: { isEmail: true }
  },
  password: { 
    type: DataTypes.STRING(255), 
    allowNull: false,
    validate: { len: [4, 255] }
  },
  role: { 
    type: DataTypes.ENUM('client', 'psychologist'), 
    defaultValue: 'client' 
  },
  specialization: { 
    type: DataTypes.STRING(255), 
    allowNull: true 
  },
  price: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: true,
    validate: { min: 0, max: 10000 }
  },
  description: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  photo_url: { 
    type: DataTypes.STRING(512), 
    allowNull: true 
  },
  rating: { 
    type: DataTypes.DECIMAL(3, 2), 
    defaultValue: 0,
    validate: { min: 0, max: 5 }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Appointment = sequelize.define('Appointment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  client_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  psychologist_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  date: { type: DataTypes.DATE, allowNull: false },
  status: { 
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'), 
    defaultValue: 'pending' 
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  rating_given: { type: DataTypes.BOOLEAN, defaultValue: false }  // <-- ДОБАВИТЬ ЭТУ СТРОКУ
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Message = sequelize.define('Message', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  appointment_id: { type: DataTypes.INTEGER, allowNull: false },
  from_user_id: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Ассоциации
User.hasMany(Appointment, { foreignKey: 'client_id', as: 'client_appointments' });
User.hasMany(Appointment, { foreignKey: 'psychologist_id', as: 'psychologist_appointments' });
Appointment.belongsTo(User, { as: 'client', foreignKey: 'client_id' });
Appointment.belongsTo(User, { as: 'psychologist', foreignKey: 'psychologist_id' });

Appointment.hasMany(Message, { foreignKey: 'appointment_id' });
Message.belongsTo(Appointment, { foreignKey: 'appointment_id' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'from_user_id' });

module.exports = { sequelize, User, Appointment, Message };