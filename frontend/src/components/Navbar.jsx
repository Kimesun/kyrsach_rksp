import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar({ user, setUser, setToken }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <h2>🧠 Психолог Онлайн</h2>
      <div>
        {user ? (
          <>
            <Link to="/psychologists" style={{ marginRight: '15px' }}>Психологи</Link>
            <Link to="/dashboard" style={{ marginRight: '15px' }}>Личный кабинет</Link>
            <button onClick={handleLogout} className="btn">Выйти</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ marginRight: '15px' }}>Вход</Link>
            <Link to="/register">Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;