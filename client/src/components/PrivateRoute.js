import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: '#7c6dfa', padding: 40, fontFamily: 'monospace' }}>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;