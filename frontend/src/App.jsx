import './App.css';
import { ToastContainer } from 'react-toastify';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Suspense } from 'react';

// MAPPER
const routes = [];

const modules = import.meta.glob('../**/index.jsx', {
  import: 'default',
  eager: true
});
for (const key in modules) {
  const module = modules[key];
  Object.entries(module.routes).forEach(([path, Element]) => {
    const NavigateComponent = () => {
      const navigate = useNavigate();
      const routeParams = useParams();
      const history = {
        push: (path, state) => navigate(path, { state }),
      };
      return <Element {...{ navigate, history, routeParams }} />;
    };
    routes.push(<Route key={path} path={path} element={<NavigateComponent />} />);
  });
}

function App() {
  // TODO SIDE BAR
  return (
    <BrowserRouter>
      <div>
        <ToastContainer />
        <Suspense fallback={<h6>Loading...</h6>}>
          <Routes>
            {routes}
            <Route path='*' element={<h6>Không có đường dẫn...</h6>} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>

  );
}

export default App;
