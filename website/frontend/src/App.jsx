import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login            from './pages/Login';
import Sidebar          from './components/Sidebar';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MarkAttendance   from './pages/teacher/MarkAttendance';
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

function RequireTeacher({ children }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'var(--bg)' }}>
      <span className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'teacher') return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: {
            background:'var(--surface2)', color:'var(--text)',
            border:'1px solid var(--border2)', fontSize:'0.85rem',
            fontFamily:'DM Sans,sans-serif',
          },
          success: { iconTheme:{ primary:'var(--jade2)', secondary:'var(--surface2)' } },
          error:   { iconTheme:{ primary:'var(--red)',   secondary:'var(--surface2)' } },
        }} />

        <Routes>
          {/* Default: go to login */}
          <Route path="/"      element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* All teacher routes */}
          <Route path="/teacher" element={
            <RequireTeacher><Layout><TeacherDashboard /></Layout></RequireTeacher>
          } />
          <Route path="/teacher/mark" element={
            <RequireTeacher><Layout><MarkAttendance /></Layout></RequireTeacher>
          } />
          <Route path="/teacher/students" element={
            <RequireTeacher><Layout><TeacherStudents /></Layout></RequireTeacher>
          } />
          <Route path="/teacher/import" element={
            <RequireTeacher><Layout><ImportCSV /></Layout></RequireTeacher>
          } />

          {/* Catch-all → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
