import apiClient from './apiClient.js';

export const getTestSessions = (params) => apiClient.get('/test-sessions', { params });
export const getTestSessionById = (id) => apiClient.get(`/test-sessions/${id}`);
export const createTestSession = (data) => apiClient.post('/test-sessions', data);
export const addObservations = (sessionId, data) => apiClient.post(`/test-sessions/${sessionId}/observations`, { observations: [data] });
export const submitSession = (sessionId) => apiClient.post(`/test-sessions/${sessionId}/submit`);
export const approveSession = (sessionId) => apiClient.post(`/test-sessions/${sessionId}/approve`);
export const updateObservation = (sessionId, obsId, data) => apiClient.patch(`/test-sessions/${sessionId}/observations/${obsId}`, data);
export const deleteObservation = (sessionId, obsId) => apiClient.delete(`/test-sessions/${sessionId}/observations/${obsId}`);
