import '@fontsource-variable/league-spartan';
import '@fontsource/instrument-serif';
import '@fontsource/courier-prime';
import '@refinedev/antd/dist/reset.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
