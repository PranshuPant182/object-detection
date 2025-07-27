import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const token = Cookies.get('token');
    const method = sessionStorage.getItem('loginMethod');
    return token ? { token, method } : null;
  });

  const publicRoutes = ['/',];

  const interval = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlToken = searchParams.get('token');

  const handleLogOut = async () => {
    logout()
  }


  useEffect(() => {
    const validateToken = () => {
      const token = Cookies.get('token');

      //  Skip validation temporarily if URL has token (Login will handle it)
      if (urlToken) return;

      if (token !== undefined) {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp < currentTime) {
          handleLogOut();
          toast.error('Session expired! Please log in again.');
          return;
        }
      } else if (!publicRoutes.includes(location.pathname)) {
        handleLogOut();
        toast.error('Session expired! Please log in again.');
        if (interval.current != null) {
          clearInterval(interval.current);
        }
      }
    };

    validateToken();

    if (!publicRoutes.includes(location.pathname) && !urlToken) {
      interval.current = setInterval(() => {
        validateToken();
      }, 1000 * 5);
    }

    return () => clearInterval(interval.current);
  }, [location.pathname, urlToken]);

  const login = (token) => {
    try {
      const decodedToken = jwtDecode(token);
      const expiresIn = decodedToken.exp - Date.now() / 1000;

      if (expiresIn > 0) {
        Cookies.set('token', token, {
          expires: expiresIn / (60 * 60 * 24),
          sameSite: 'Lax',
        });

        const method = sessionStorage.getItem('loginMethod') || 'manual'; //use this
        setAuth({ token, method }); //store method in state
      } else {
        console.log("Token expired");
      }
    } catch (error) {
      console.log("Error decoding token", error);
    }
  };



  const logout = () => {
    Cookies.remove('token');
    sessionStorage.removeItem('selectedFlightID');
    sessionStorage.removeItem('selectedFlightNumber');
    sessionStorage.removeItem('loginMethod');
    setAuth(null);
    navigate('/', { replace: true });
  };

  // Include loginMethod in context for use in UI
  const contextValue = useMemo(() => ({
    auth,
    login,
    logout,
    loginMethod: auth?.method || null,
  }), [auth, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {/* <Toaster /> */}
      {children}
    </AuthContext.Provider>
  );
};
