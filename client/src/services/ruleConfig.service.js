import apiClient from './apiClient.js';

export const getRuleConfigs = (params) => apiClient.get('/rule-configs', { params });
export const createRuleConfig = (data) => apiClient.post('/rule-configs', data);
export const activateRuleConfig = (id, data) => apiClient.post(`/rule-configs/${id}/activate`, data);
