import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Psychologists from './pages/Psychologists';
import PsychologistProfile from './pages/PsychologistProfile';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
  }, [token]);

  return (
    <BrowserRouter>
      <Navbar user={user} setUser={setUser} setToken={setToken} />
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} setToken={setToken} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/psychologists" element={user ? <Psychologists user={user} /> : <Navigate to="/login" />} />
        <Route path="/psychologist/:id" element={user ? <PsychologistProfile user={user} /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/chat/:appointmentId" element={user ? <ChatPage user={user} /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/psychologists" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;