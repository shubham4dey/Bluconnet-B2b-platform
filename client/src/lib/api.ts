import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = async (email: string, password: string) => {
  try {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 503) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      return res.data;
    }
    throw err;
  }
};

export const signup = async (name: string, email: string, password: string) => {
  try {
    const res = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('token', res.data.token);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 503) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await api.post('/auth/signup', { name, email, password });
      localStorage.setItem('token', res.data.token);
      return res.data;
    }
    throw err;
  }
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const getCompanies = async (params: any) => {
  const res = await api.get('/companies', { params });
  return res.data;
};

export const importCompanies = async (file: File, duplicateAction: 'skip' | 'update') => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/companies/import', formData, {
    params: { duplicateAction },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getImportLogs = async () => {
  const res = await api.get('/companies/import/logs');
  return res.data;
};

// Employees with platform login accounts who logged in at least once —
// usable for assignment dropdowns. ADMINs + EMPLOYEEs only (SUPER_ADMINs never
// appear as assignees). Sorted A→Z by name for dropdowns.
export const getAssignableUsers = async () => {
  const res = await api.get('/users/assignable');
  return res.data;
};

// Distinct Affiliate Manager names already used on companies (legacy / filter backup).
export const getAccountManagers = async () => {
  const res = await api.get('/companies/account-managers');
  return res.data;
};

export const createCompany = async (data: any) => {
  const res = await api.post('/companies', data);
  return res.data;
};

export const updateCompany = async (id: string, data: any) => {
  const res = await api.put(`/companies/${id}`, data);
  return res.data;
};

export const updateCompanyStatus = async (id: string, status: string) => {
  const res = await api.patch(`/companies/${id}/status`, { status });
  return res.data;
};

export const deleteCompany = async (id: string) => {
  const res = await api.delete(`/companies/${id}`);
  return res.data;
};

export const deleteCompaniesBulk = async (ids: string[]) => {
  const res = await api.post('/companies/bulk-delete', { ids });
  return res.data;
};

export const getCompanyFeedback = async (companyId: string) => {
  const res = await api.get(`/companies/${companyId}/feedback`);
  return res.data;
};

export const addCompanyFeedback = async (companyId: string, comment: string) => {
  const res = await api.post(`/companies/${companyId}/feedback`, { comment });
  return res.data;
};

export const exportCompaniesCsv = async (params: any = {}) => {
  const res = await api.get('/companies/export', { params, responseType: 'blob' });
  return res.data as Blob;
};

// User management (admin)
export const getEmployees = async () => {
  const res = await api.get('/users');
  return res.data;
};

export const createEmployee = async (data: any) => {
  const res = await api.post('/users', data);
  return res.data;
};

export const updateEmployee = async (id: string, data: any) => {
  const res = await api.patch(`/users/${id}`, data);
  return res.data;
};

export const changeEmployeePassword = async (id: string, password: string) => {
  const res = await api.patch(`/users/${id}/password`, { password });
  return res.data;
};

export const toggleEmployeeStatus = async (id: string) => {
  const res = await api.patch(`/users/${id}/status`);
  return res.data;
};

export const deleteEmployee = async (id: string) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};

export default api;