import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { Link } from 'react-router-dom';
import { Users, BookOpen, TrendingUp, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load subjects and students safely
        const [subsRes, studsRes] = await Promise.all([
          api.getTeacherSubjects().catch(() => ({ data: [] })),
          api.getAllStudents().catch(() => ({ data: [] })),
        ]);

        const subs = subsRes.data || [];
        const studs = studsRes.data || [];

        setSubjects(subs);
        setStudents(studs);

        // Load analytics for each subject safely
        const analyticsMap = {};
        for (const s of subs) {
          try {
            const res = await api.getAnalytics(s.id);
            analyticsMap[s.id] = res.data;
          } catch (err) {
            console.warn(`Failed to load analytics for subject ${s.id}`, err);
            analyticsMap[s.id] = { stats: [], daily: [], subject: s };
          }
        }
        setAnalytics(analyticsMap);

      } catch (err) {
        console.error("Dashboard load error:", err);
        setError("Failed to load dashboard data. Please check your connection and Firebase setup.");
        toast.error("Some data failed to load");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  // Calculate stats safely
  const avgPct = subjects.length
    ? Math.round(
        Object.values(analytics).reduce((a, d) => {
          const arr = d?.stats || [];
          return a + (arr.length ? arr.reduce((s, r) => s + (r.percentage || 0), 0) / arr.length : 0);
        }, 0) / subjects.length
      )
    : 0;

  const totalDays = Object.values(analytics).reduce((a, d) => a + (d?.daily?.length || 0), 0);

  // At-risk students
  const atRiskRows = Object.values(analytics).flatMap(d =>
    (d?.stats || []).filter(s => s.percentage < 75)
      .map(s => ({ 
        ...s, 
        subjectName: d.subject?.name || 'Unknown', 
        subjectCode: d.subject?.code 
      }))
  ).slice(0, 6);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="page slide-up" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <AlertTriangle size={48} style={{ color: 'var(--red)', marginBottom: 16 }} />
        <h2 style={{ color: 'var(--red)' }}>Dashboard Load Error</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto 2rem' }}>
          {error}
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="page slide-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 600, margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.867rem', marginTop: 4 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '2rem' }}>
        {[
          { label: 'Subjects', value: subjects.length, icon: BookOpen, col: 'var(--jade2)' },
          { label: 'Students', value: students.length, icon: Users, col: '#818cf8' },
          { label: 'Sessions Held', value: totalDays, icon: CheckCircle, col: 'var(--amber)' },
          { label: 'Avg Attendance', value: `${avgPct}%`, icon: TrendingUp, col: avgPct >= 75 ? 'var(--jade2)' : 'var(--red)' },
        ].map(({ label, value, icon: Icon, col }) => (
          <div key={label} className="card card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 700, color: col }}>{value}</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `color-mix(in srgb, ${col} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={17} color={col} />
            </div>
          </div>
        ))}
      </div>

      {/* Subject cards */}
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>Your Subjects</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: '2rem' }}>
        {subjects.map(s => {
          const d = analytics[s.id] || {};
          const avg = d?.stats?.length
            ? Math.round(d.stats.reduce((a, r) => a + (r.percentage || 0), 0) / d.stats.length)
            : 0;
          const risk = d?.stats?.filter(r => r.percentage < 75).length || 0;

          return (
            <div key={s.id} className="card card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--jade2)', marginBottom: 4 }}>{s.code}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.3 }}>{s.name}</div>
                </div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 700, color: avg >= 75 ? 'var(--jade2)' : 'var(--red)' }}>
                  {avg}%
                </div>
              </div>

              {risk > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--amber)', background: 'var(--amber-bg)', padding: '4px 10px', borderRadius: 6, marginBottom: 12 }}>
                  <AlertTriangle size={11} /> {risk} student{risk > 1 ? 's' : ''} below 75%
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/teacher/mark?subject=${s.id}&date=${today}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  Mark Today
                </Link>
                <Link to={`/teacher/analytics?subject=${s.id}`} className="btn btn-ghost btn-icon btn-sm">
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* At-risk table */}
      {atRiskRows.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>
            ⚠ Students Needing Attention
          </h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Subject</th>
                  <th>Attendance</th>
                  <th>Classes</th>
                </tr>
              </thead>
              <tbody>
                {atRiskRows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {r.roll_no}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.subjectName}</td>
                    <td><span className="badge badge-absent">{r.percentage}%</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.present}/{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subjects.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No subjects found. Run <code>node seed.js</code> in backend to create demo data.
        </div>
      )}
    </div>
  );
}