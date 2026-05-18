import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Psychologists({ user }) {
  const [psychologists, setPsychologists] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/psychologists').then(res => setPsychologists(res.data));
  }, []);

  return (
    <div className="container">
      <h1>Наши психологи</h1>
      <div className="psychologists-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
        {psychologists.map(p => (
          <div key={p.id} className="card psychologist-card" onClick={() => navigate(`/psychologist/${p.id}`)}>
            <div style={{ fontSize: '50px', textAlign: 'center' }}>🧑‍⚕️</div>
            <h3>{p.name}</h3>
            <p><strong>Специализация:</strong> {p.specialization}</p>
            <p><strong>Цена:</strong> {p.price} ₽ / сессия</p>
            <p><strong>Рейтинг:</strong> ⭐ {p.rating}</p>
            <button className="btn" onClick={(e) => { e.stopPropagation(); navigate(`/chat/${p.id}`); }}>Написать</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Psychologists;