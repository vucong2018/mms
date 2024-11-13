import './App.css';
import { ToastContainer } from 'react-toastify';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Suspense } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from './components/app-header';
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
      <SidebarProvider>
        <AppSidebar />
        <div className='h-full w-full'>
          <AppHeader />
          <div className='p-4'>
            <Suspense fallback={<h6>Loading...</h6>}>
              <Routes>
                {routes}
                <Route path='*' element={<h6>Không có đường dẫn...</h6>} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </SidebarProvider>
      <ToastContainer />
    </BrowserRouter>

  );
}

export default App;
