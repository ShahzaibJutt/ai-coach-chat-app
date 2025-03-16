import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (token && userId) {
      setCurrentUser({
        token,
        userId
      });
    }
    
    setLoading(false);
  }, []);

  // Login function
  async function login(username, password) {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_API_URL}/auth/login`, {
        username,
        password
      });
      
      const { access_token } = response.data;
      
      // Try to decode the token to get user information
      let userId;
      try {
        const decoded = jwtDecode(access_token);
        userId = decoded.user_id || decoded.sub;
      } catch (error) {
        // If we can't decode the token, use the username as userId
        userId = username;
      }
      
      // Store token and user info in localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('userId', userId);
      
      // Update current user state
      setCurrentUser({
        token: access_token,
        userId
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Signup function
  async function signup(username, email, password, fullName = '') {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_API_URL}/auth/register`, {
        username,
        email,
        password,
        full_name: fullName
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Logout function
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setCurrentUser(null);
  }

  const value = {
    currentUser,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 