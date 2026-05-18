import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client', specialization: '', price: '', description: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      alert('Ошибка регистрации');
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '500px', margin: '50px auto' }}>
        <h2>Регистрация</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Имя" onChange={(e) => setForm({...form, name: e.target.value})} required />
          <input type="email" placeholder="Email" onChange={(e) => setForm({...form, email: e.target.value})} required />
          <input type="password" placeholder="Пароль" onChange={(e) => setForm({...form, password: e.target.value})} required />
          <select onChange={(e) => setForm({...form, role: e.target.value})}>
            <option value="client">Клиент</option>
            <option value="psychologist">Психолог</option>
          </select>
          {form.role === 'psychologist' && (
            <>
              <input type="text" placeholder="Специализация" onChange={(e) => setForm({...form, specialization: e.target.value})} />
              <input type="number" placeholder="Цена за сессию" onChange={(e) => setForm({...form, price: e.target.value})} />
              <textarea placeholder="Описание" onChange={(e) => setForm({...form, description: e.target.value})} />
            </>
          )}
          <button type="submit" className="btn">Зарегистрироваться</button>
        </form>
      </div>
    </div>
  );
}

export default Register;