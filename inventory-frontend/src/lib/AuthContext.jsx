import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '@/api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/me');
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // const login = async (username, password) => {
  //   try {
  //     // Send JSON instead of FormData
  //     const response = await api.post('/login', {
  //       username,
  //       password
  //     }, {
  //       headers: {
  //         'Content-Type': 'application/x-www-form-urlencoded'
  //       }
  //     });
      
  //     const token = response.data.access_token;

  //     localStorage.setItem('token', token);
  //     setUser({ username });
  //     setIsAuthenticated(true);

  //     return { success: true };
  //   } catch (error) {
  //     console.error('Login failed:', error);
      
  //     let errorMessage = 'Login failed';
  //     if (error.response?.data?.detail) {
  //       const detail = error.response.data.detail;
  //       if (Array.isArray(detail)) {
  //         errorMessage = detail[0]?.msg || 'Validation error';
  //       } else if (typeof detail === 'string') {
  //         errorMessage = detail;
  //       }
  //     }

  //     return {
  //       success: false,
  //       error: errorMessage
  //     };
  //   }
  // };

    const login = async (username, password) => {
    try {
      const response = await api.post('/login', {
        username,
        password
      });
      
      const token = response.data.access_token;

      localStorage.setItem('token', token);
      setUser({ username });
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      
      let errorMessage = 'Login failed';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail[0]?.msg || 'Validation error';
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

