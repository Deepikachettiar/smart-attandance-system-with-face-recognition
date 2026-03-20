import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login            from './pages/Login';
import Sidebar          from './components/Sidebar';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendance from './pages/student/StudentAttendance';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MarkAttendance   from './pages/teacher/MarkAttendance';
import TeacherAnalytics from './pages/teacher/TeacherAnalytics';
import TeacherStudents  from './pages/teacher/TeacherStudents';
import ImportCSV        from './pages/teacher/ImportCSV';

function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <span className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border2)', fontSize:'0.85rem', fontFamily:'DM Sans, sans-serif' },
            success: { iconTheme: { primary:'var(--jade2)', secondary:'var(--surface2)' } },
            error:   { iconTheme: { primary:'var(--red)',   secondary:'var(--surface2)' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Student routes */}
          <Route path="/student" element={
            <RequireAuth role="student">
              <Layout><StudentDashboard /></Layout>
            </RequireAuth>
          } />
          <Route path="/student/attendance" element={
            <RequireAuth role="student">
              <Layout><StudentAttendance /></Layout>
            </RequireAuth>
          } />

          {/* Teacher routes */}
          <Route path="/teacher" element={
            <RequireAuth role="teacher">
              <Layout><TeacherDashboard /></Layout>
            </RequireAuth>
          } />
          <Route path="/teacher/mark" element={
            <RequireAuth role="teacher">
              <Layout><MarkAttendance /></Layout>
            </RequireAuth>
          } />
          <Route path="/teacher/analytics" element={
            <RequireAuth role="teacher">
              <Layout><TeacherAnalytics /></Layout>
            </RequireAuth>
          } />
          <Route path="/teacher/students" element={
            <RequireAuth role="teacher">
              <Layout><TeacherStudents /></Layout>
            </RequireAuth>
          } />
          <Route path="/teacher/import" element={
            <RequireAuth role="teacher">
              <Layout><ImportCSV /></Layout>
            </RequireAuth>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
