import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/topics/kubernetes" replace />} />
        <Route path="/topics/:topicId" element={<App />} />
        <Route path="/careers" element={<App />} />
        <Route path="*" element={<Navigate to="/topics/kubernetes" replace />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </React.StrictMode>
);
