import React from 'react';
import ReactDOM from 'react-dom/client';
import UberSynergyApp from './components/UberSynergyApp.js'; // MUST use .js now
// import './index.css'; // Assuming you have a CSS file for styles

// Get the root element from public/index.html
const rootElement = document.getElementById('root');

// Use the React 18 client API to render the component
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <UberSynergyApp />
  </React.StrictMode>
);