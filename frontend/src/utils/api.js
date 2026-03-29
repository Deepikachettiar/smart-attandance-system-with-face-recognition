import axios from 'axios';
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'https://your-backend-on-render.up.railway.app';

export const api = {
  // Teacher subjects (FIXED)
  getTeacherSubjects: () => axios.get('/api/attendance/teacher/subjects'),

  // Class list for marking
  getClassAttendance: (subId, date) =>
    axios.get(`/api/attendance/class/${subId}`, { params: { date } }),

  // Mark attendance
  bulkMark: (data) => axios.post('/api/attendance/bulk-mark', data),
  markAttendance: (data) => axios.post('/api/attendance/mark', data),

  // CSV Import
  importCSV: (data) => axios.post('/api/attendance/import-csv', data),

  // Export
  exportAttendance: (subId, params) =>
    axios.get(`/api/attendance/export/${subId}`, { params }),

  // Analytics (was MISSING!)
  getAnalytics: (subjectId) =>
    axios.get(`/api/attendance/analytics/${subjectId}`),

  // Students
  getAllStudents: () => axios.get('/api/students'),
};

export const downloadCSV = (rows, filename) => {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};