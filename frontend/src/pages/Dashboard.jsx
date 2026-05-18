import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Dashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [showRatingModal, setShowRatingModal] = useState(null); // { appointmentId, psychologistId, psychologistName }
  const [ratingValue, setRatingValue] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments/my');
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  const completeSession = async (id) => {
    if (window.confirm('Завершить сессию? После завершения вы сможете оценить психолога.')) {
      try {
        await api.put(`/appointments/${id}/complete`);
        fetchAppointments();
      } catch (err) {
        alert('Ошибка: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const deleteSession = async (id) => {
    if (window.confirm('Удалить сессию? Это действие нельзя отменить.')) {
      try {
        await api.delete(`/appointments/${id}`);
        fetchAppointments();
      } catch (err) {
        alert('Ошибка: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const submitRating = async () => {
    try {
      await api.post(`/ratings/${showRatingModal.psychologistId}`, { rating: ratingValue });
      alert('Спасибо за оценку!');
      setShowRatingModal(null);
      setRatingValue(5);
      fetchAppointments(); // Обновляем список, чтобы скрыть кнопку рейтинга
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.message || err.message));
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('ru-RU');
  };

  const getStatusText = (status) => {
    const statuses = {
      pending: '⏳ Ожидает подтверждения',
      confirmed: '✅ Подтверждена',
      completed: '✓ Завершена',
      cancelled: '❌ Отменена'
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ff9800',
      confirmed: '#4caf50',
      completed: '#2196f3',
      cancelled: '#f44336'
    };
    return colors[status] || '#666';
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Личный кабинет</h1>
        <p><strong>Имя:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Роль:</strong> {user.role === 'client' ? 'Клиент' : 'Психолог'}</p>
      </div>

      <div className="card">
        <h2>📅 Мои встречи</h2>
        {appointments.length === 0 ? (
          <p>Пока нет запланированных встреч</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {appointments.map(apt => (
              <div key={apt.id} style={{ border: `1px solid ${getStatusColor(apt.status)}`, borderRadius: '10px', padding: '15px' }}>
                <p><strong>📅 Дата:</strong> {formatDate(apt.date)}</p>
                {user.role === 'client' ? (
                  <p><strong>🧑‍⚕️ Психолог:</strong> {apt.psychologist?.name}</p>
                ) : (
                  <p><strong>👤 Клиент:</strong> {apt.client?.name}</p>
                )}
                <p><strong>📌 Статус:</strong> <span style={{ color: getStatusColor(apt.status) }}>{getStatusText(apt.status)}</span></p>
                
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {user.role === 'psychologist' && apt.status === 'pending' && (
                    <>
                      <button className="btn" onClick={() => updateStatus(apt.id, 'confirmed')} style={{ background: 'green' }}>✅ Подтвердить</button>
                      <button className="btn" onClick={() => updateStatus(apt.id, 'cancelled')} style={{ background: 'red' }}>❌ Отклонить</button>
                    </>
                  )}
                  
                  {apt.status === 'confirmed' && (
                    <button className="btn" onClick={() => completeSession(apt.id)} style={{ background: '#2196f3' }}>
                      🏁 Завершить сессию
                    </button>
                  )}
                  
                  {(apt.status === 'confirmed' || apt.status === 'completed') && (
                    <button className="btn" onClick={() => navigate(`/chat/${apt.id}`)} style={{ background: '#667eea' }}>
                      💬 Перейти в чат
                    </button>
                  )}
                  
                  {user.role === 'psychologist' && apt.status === 'completed' && (
                    <button className="btn" onClick={() => deleteSession(apt.id)} style={{ background: '#f44336' }}>
                      🗑️ Удалить сессию
                    </button>
                  )}
                  
                  {user.role === 'client' && apt.status === 'completed' && !apt.rating_given && (
                    <button className="btn" onClick={() => setShowRatingModal({
                      appointmentId: apt.id,
                      psychologistId: apt.psychologist?.id,
                      psychologistName: apt.psychologist?.name
                    })} style={{ background: '#ff9800' }}>
                      ⭐ Оценить психолога
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно для рейтинга */}
      {showRatingModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h2>Оцените психолога</h2>
            <p>{showRatingModal.psychologistName}</p>
            
            <div style={{ fontSize: '40px', display: 'flex', justifyContent: 'center', gap: '5px', margin: '20px 0' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span
                  key={star}
                  onClick={() => setRatingValue(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    cursor: 'pointer',
                    color: (hoverRating || ratingValue) >= star ? '#ffc107' : '#ddd',
                    transition: '0.2s'
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            
            <p style={{ marginBottom: '20px' }}>Ваша оценка: {ratingValue} из 5</p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" onClick={submitRating} style={{ background: '#ff9800' }}>Отправить оценку</button>
              <button className="btn" onClick={() => setShowRatingModal(null)} style={{ background: '#999' }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;