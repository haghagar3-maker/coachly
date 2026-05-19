import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App';

// Make #root fill the full body flex container
const root = document.getElementById('root');
root.style.flex = '1';
root.style.width = '100%';
root.style.minHeight = '100vh';
root.style.display = 'flex';
root.style.flexDirection = 'column';

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);