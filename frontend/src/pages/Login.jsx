import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login({ setUser, setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      navigate('/psychologists');
    } catch (err) {
      setError('Неверный email или пароль');
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
        <h2>Вход в систему</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn">Войти</button>
        </form>
        <p style={{ marginTop: '15px' }}>Нет аккаунта? <a href="/register">Зарегистрироваться</a></p>
      </div>
    </div>
  );
}

export default Login;