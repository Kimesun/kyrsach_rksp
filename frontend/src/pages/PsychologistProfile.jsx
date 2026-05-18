import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function PsychologistProfile({ user }) {
  const { id } = useParams();
  const [psych, setPsych] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/psychologists/${id}`).then(res => setPsych(res.data));
  }, [id]);

  const handleBooking = async () => {
    if (!date) {
      alert('Выберите дату и время');
      return;
    }
    setLoading(true);
    try {
      await api.post('/appointments', {
        psychologist_id: id,
        date: new Date(date).toISOString()
      });
      alert('Запись создана! Ожидайте подтверждения психолога.');
      setShowBooking(false);
      setDate('');
      navigate('/dashboard');
    } catch (err) {
      alert('Ошибка при записи: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!psych) return <div>Загрузка...</div>;

  return (
    <div className="container">
      <div className="card">
        <div style={{ fontSize: '80px', textAlign: 'center' }}>🧑‍⚕️</div>
        <h1>{psych.name}</h1>
        <p><strong>Специализация:</strong> {psych.specialization}</p>
        <p><strong>Цена:</strong> {psych.price} ₽ / сессия</p>
        <p><strong>Рейтинг:</strong> ⭐ {psych.rating}</p>
        <p><strong>Описание:</strong> {psych.description}</p>
        
        {user.role === 'client' && (
          <button className="btn" onClick={() => setShowBooking(true)}>
            📅 Записаться на консультацию
          </button>
        )}
      </div>

      {/* Модальное окно записи */}
      {showBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h2>Запись к {psych.name}</h2>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', margin: '15px 0' }}
            />
            <p>Стоимость: {psych.price} ₽</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn" onClick={handleBooking} disabled={loading}>
                {loading ? 'Запись...' : 'Подтвердить запись'}
              </button>
              <button className="btn" onClick={() => setShowBooking(false)} style={{ background: '#999' }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PsychologistProfile;