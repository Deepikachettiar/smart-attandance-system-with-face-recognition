import axios from 'axios';

export const api = {
  // Auth
  login: (email, password) => axios.post('/api/auth/login', { email, password }),

  // Student
  getStudentAttendance: (id, params) => axios.get(`/api/attendance/student/${id}`, { params }),
  getStudentSummary:    (id)         => axios.get(`/api/attendance/summary/${id}`),
  getStudentSubjects:   (id)         => axios.get(`/api/students/${id}/subjects`),

  // Teacher
  getTeacherSubjects: () => axios.get('/api/attendance/teacher/all-subjects'),  getClassAttendance:   (subId, date)   => axios.get(`/api/attendance/class/${subId}`, { params: { date } }),
  markAttendance:       (data)          => axios.post('/api/attendance/mark', data),
  bulkMark:             (data)          => axios.post('/api/attendance/bulk-mark', data),
  importCSV:            (data)          => axios.post('/api/attendance/import-csv', data),
  exportAttendance:     (subId, params) => axios.get(`/api/attendance/export/${subId}`, { params }),
  getAllStudents:        ()              => axios.get('/api/students'),
};

export const downloadCSV = (rows, filename) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};
