import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Dashboard from './Pages/Dashboard.jsx';
import Login from './Pages/LoginPage/Login.jsx';
import { AuthProvider } from './Authentication/AuthProvider.jsx';
import ProtectedRoute from './Authentication/ProtectedRoute.jsx';
const homepage = import.meta.env.VITE_HOMEPAGE;

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={homepage}>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
