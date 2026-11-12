import { createRoot } from 'react-dom/client';
import App from './app/App';
import { upgradeLegacyUrl } from './shared/routing/router';
import './styles/global.css';

// Old shared links looked like /#/shop; turn them into /shop before the first render.
upgradeLegacyUrl();

createRoot(document.getElementById('root')!).render(<App />);
