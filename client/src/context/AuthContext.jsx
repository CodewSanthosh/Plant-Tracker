import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('plantTrackerToken');
    const savedUser = localStorage.getItem('plantTrackerUser');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser({ _id: userData._id, email: userData.email });
    setToken(userData.token);
    localStorage.setItem('plantTrackerToken', userData.token);
    localStorage.setItem('plantTrackerUser', JSON.stringify({
      _id: userData._id,
      email: userData.email,
    }));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('plantTrackerToken');
    localStorage.removeItem('plantTrackerUser');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
