import axios from 'axios';

// In production, frontend is served from Express (same origin), so '/api' works.
// In development, Vite runs on :5173, so we need the full URL to Express on :5000.
const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';


// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('plantTrackerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('plantTrackerToken');
      localStorage.removeItem('plantTrackerUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const loginUser = async (username, password) => {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
};

export const registerUser = async (username, password) => {
  const { data } = await api.post('/auth/register', { username, password });
  return data;
};

// Plants API
export const getPlants = async () => {
  const { data } = await api.get('/plants');
  return data;
};

export const addPlant = async (formData) => {
  const { data } = await api.post('/plants', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deletePlant = async (id) => {
  const { data } = await api.delete(`/plants/${id}`);
  return data;
};

export const getPlantCount = async () => {
  const { data } = await api.get('/plants/count');
  return data;
};

export default api;
