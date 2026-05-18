import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function ChatPage({ user }) {
  const { appointmentId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Загружаем информацию о сессии
  useEffect(() => {
    const loadAppointment = async () => {
      try {
        const res = await api.get('/appointments/my');
        const found = res.data.find(a => a.id === parseInt(appointmentId));
        if (found) {
          console.log('✅ Сессия загружена:', found);
          setAppointment(found);
        } else {
          console.error('❌ Сессия не найдена');
        }
      } catch (err) {
        console.error('Ошибка загрузки сессии:', err);
      }
    };
    loadAppointment();
  }, [appointmentId]);

  // Загружаем историю сообщений
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await api.get(`/messages/${appointmentId}`);
        console.log('✅ Загружено сообщений:', res.data.length);
        // Убеждаемся, что сообщения в правильном формате
        const formattedMessages = res.data.map(msg => ({
          id: msg.id,
          message: msg.message,
          from_user_id: msg.from_user_id,
          sender_name: msg.sender?.name || (msg.from_user_id === user.id ? user.name : 'Собеседник'),
          created_at: msg.created_at
        }));
        setMessages(formattedMessages);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка загрузки сообщений:', err);
        setLoading(false);
      }
    };
    loadMessages();
  }, [appointmentId, user.id, user.name]);

  // Подключаем WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Нет токена для WebSocket');
      return;
    }

    // Создаём соединение
    const socket = new WebSocket(`ws://localhost:5000/ws?token=${token}`);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('🔌 WebSocket connected');
      setConnected(true);
      // Отправляем join в комнату
      socket.send(JSON.stringify({
        type: 'join',
        appointment_id: parseInt(appointmentId)
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket received:', data);
        
        if (data.type === 'chat') {
          // Новое сообщение
          const newMessage = {
            id: data.id,
            message: data.message,
            from_user_id: data.from_user_id,
            sender_name: data.senderName,
            created_at: data.created_at
          };
          
          setMessages(prev => {
            // Проверяем, нет ли уже такого сообщения
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);
    };

    return () => {
      if (socket && socket.readyState === 1) {
        socket.close();
      }
    };
  }, [appointmentId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    if (!wsRef.current || wsRef.current.readyState !== 1) {
      alert('Нет соединения с сервером. Попробуйте обновить страницу.');
      return;
    }
    
    const messageText = input;
    
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      appointment_id: parseInt(appointmentId),
      message: messageText
    }));
    
    setInput('');
  };

  // Автоскролл при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Определяем собеседника
  const getOtherUserName = () => {
    if (!appointment) return 'Загрузка...';
    if (user.role === 'client') {
      return appointment.psychologist?.name || 'Психолог';
    } else {
      return appointment.client?.name || 'Клиент';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
          Загрузка чата...
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ height: '550px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>💬 Чат консультации</h3>
          <p style={{ fontSize: '13px', color: '#666', margin: '5px 0 0 0' }}>
            Собеседник: {getOtherUserName()}
          </p>
          <p style={{ fontSize: '11px', color: connected ? '#4caf50' : '#f44336', margin: '5px 0 0 0' }}>
            {connected ? '🟢 Онлайн' : '🔴 Офлайн'}
          </p>
        </div>
        
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          marginBottom: '20px', 
          border: '1px solid #eee', 
          borderRadius: '10px', 
          padding: '15px',
          background: '#f9f9f9'
        }}>
          {messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888' }}>Нет сообщений. Начните диалог!</p>
          ) : (
            messages.map((msg) => {
              const isMyMessage = msg.from_user_id === user.id;
              const senderName = isMyMessage ? user.name : getOtherUserName();
              
              return (
                <div 
                  key={msg.id} 
                  style={{ 
                    textAlign: isMyMessage ? 'right' : 'left', 
                    margin: '10px 0'
                  }}
                >
                  <div>
                    <small style={{ color: '#888', fontSize: '11px' }}>{senderName}</small>
                  </div>
                  <span style={{
                    background: isMyMessage ? '#667eea' : '#fff',
                    color: isMyMessage ? 'white' : '#333',
                    padding: '10px 15px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    maxWidth: '70%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    border: isMyMessage ? 'none' : '1px solid #ddd',
                    wordWrap: 'break-word'
                  }}>
                    {msg.message}
                  </span>
                  <div>
                    <small style={{ color: '#aaa', fontSize: '10px' }}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </small>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Введите сообщение..."
            style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ddd', outline: 'none' }}
            disabled={!connected}
          />
          <button 
            className="btn" 
            onClick={sendMessage} 
            disabled={!connected}
            style={{ background: connected ? '#667eea' : '#ccc' }}
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;