import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './redux/store.jsx';

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <div className='w-screen h-screen bg-white'>
      <App />
    </div>
  </Provider>
);
