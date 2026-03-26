import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function loginUser(email, password) {
  return api.post('/auth/login', { email, password }).then((r) => r.data);
}

export function registerUser(body) {
  return api.post('/auth/register', body).then((r) => r.data);
}

export function getProfile() {
  return api.get('/auth/profile').then((r) => r.data);
}

export function analyzeVitals(body) {
  return api.post('/analyze', body).then((r) => r.data);
}

export function getVitals(userId, limit = 20) {
  return api.get(`/vitals/${userId}?limit=${limit}`).then((r) => r.data);
}

export function bookAppointment(body) {
  return api.post('/actions/appointment', body).then((r) => r.data);
}

export function triggerEmergency(body) {
  return api.post('/actions/emergency', body).then((r) => r.data);
}

export function getLogs(userId, type) {
  return api.get(`/logs/${userId}${type ? `?type=${type}` : ''}`).then((r) => r.data);
}

export function getDiet(body) {
  return api.post('/diet', body).then((r) => r.data);
}

export function sendManualInput(body) {
  return api.post('/manual-input', body).then((r) => r.data);
}

export function symptomChat(body) {
  return api.post('/symptom-chat', body).then((r) => r.data);
}

export function doctorChat(body) {
  return api.post('/doctor-chat', body).then((r) => r.data);
}

export function doctorChatReset(body) {
  return api.post('/doctor-chat/reset', body).then((r) => r.data);
}

export default api;
