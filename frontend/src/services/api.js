import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth-storage');
    if (token) {
      try {
        const authData = JSON.parse(token);
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const token = localStorage.getItem('auth-storage');
        if (token) {
          const authData = JSON.parse(token);
          if (authData.state?.token) {
            const response = await axios.post(
              `${api.defaults.baseURL}/auth/verify`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${authData.state.token}`,
                },
              }
            );

            // Update token in storage
            const newAuthData = {
              ...authData,
              state: {
                ...authData.state,
                user: response.data.data.user,
              },
            };
            localStorage.setItem('auth-storage', JSON.stringify(newAuthData));

            // Retry the original request
            originalRequest.headers.Authorization = `Bearer ${authData.state.token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }

    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  verify: () => api.post('/auth/verify'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', { profile: profileData }),
  getStats: () => api.get('/auth/stats'),
};

export const problemsAPI = {
  getProblems: (params = {}) => api.get('/problems', { params }),
  getProblem: (id) => api.get(`/problems/${id}`),
  getProblemTemplate: (id, language) => api.get(`/problems/${id}/template/${language}`),
  createProblem: (problemData) => api.post('/problems', problemData),
  updateProblem: (id, problemData) => api.put(`/problems/${id}`, problemData),
  deleteProblem: (id) => api.delete(`/problems/${id}`),
  getCategories: () => api.get('/problems/meta/categories'),
  getTags: () => api.get('/problems/meta/tags'),
};

export const submissionsAPI = {
  getSubmissions: (params = {}) => api.get('/submissions', { params }),
  getSubmission: (id) => api.get(`/submissions/${id}`),
  submitSolution: (submissionData) => api.post('/submissions', submissionData),
  runSubmission: (id) => api.post(`/submissions/${id}/run`),
};

export const leaderboardAPI = {
  getLeaderboard: (params = {}) => api.get('/leaderboard', { params }),
  getLeaderboardStats: () => api.get('/leaderboard/stats'),
  getTopUsers: (count = 10) => api.get(`/leaderboard/top/${count}`),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getSubmissions: (params = {}) => api.get('/admin/submissions', { params }),
  getEvents: () => api.get('/admin/events'),
  createEvent: (eventData) => api.post('/admin/events', eventData),
  startEvent: (id) => api.put(`/admin/events/${id}/start`),
  pauseEvent: (id) => api.put(`/admin/events/${id}/pause`),
  completeEvent: (id) => api.put(`/admin/events/${id}/complete`),
};

export default api;
