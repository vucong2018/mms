import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// TODO PROVIDER REDUX...

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <App />
  // </StrictMode>,
);
