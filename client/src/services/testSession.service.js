import apiClient from './apiClient.js';

export const getTestSessions = (params) => apiClient.get('/test-sessions', { params });
export const getTestSessionById = (id) => apiClient.get(`/test-sessions/${id}`);
export const createTestSession = (data) => apiClient.post('/test-sessions', data);
export const addObservations = (sessionId, data) => apiClient.post(`/test-sessions/${sessionId}/observations`, data);
export const submitSession = (sessionId) => apiClient.post(`/test-sessions/${sessionId}/submit`);
export const approveSession = (sessionId) => apiClient.post(`/test-sessions/${sessionId}/approve`);
export const rejectSession = (sessionId) => apiClient.post(`/test-sessions/${sessionId}/reject`);
