import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, downloadCSV } from '../../utils/api';
import { Download, Filter, X } from 'lucide-react';

export default function StudentAttendance() {
  const { user } = useAuth();
  const [records,  setRecords]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters,  setFilters]  = useState({ subject_id: '', from: '', to: '' });
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.getStudentSubjects(user.id).then(r => setSubjects(r.data));
  }, [user.id]);

  useEffect(() => {
    setLoading(true);
    api.getStudentAttendance(user.id, filters)
      .then(r => setRecords(r.data))
      .finally(() => setLoading(false));
  }, [user.id, filters]);

  const counts = records.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const hasFilters = filters.subject_id || filters.from || filters.to;

  return (
    <div className="page slide-up">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.8rem', fontWeight:600, margin:0 }}>My Attendance</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.867rem', marginTop:4 }}>{records.length} records</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => downloadCSV(records.map(r => ({
          Date: r.date, Time: r.time?.split('T')[1]?.slice(0,8)||'', Subject: r.subjectName, Code: r.subjectCode, Status: r.status, Method: r.method
        })), 'my_attendance.csv')}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary chips */}
      <div style={{ display:'flex', gap:8, marginBottom:'1.5rem' }}>
        {[['Present','present'],['Absent','absent'],['Late','late']].map(([lbl,key]) => (
          <span key={key} className={`badge badge-${key}`} style={{ fontSize:'0.82rem', padding:'0.3rem 0.875rem' }}>
            {counts[lbl] || 0} {lbl}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="card card-body" style={{ display:'flex', flexWrap:'wrap', gap:14, alignItems:'flex-end', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text-muted)', fontSize:'0.82rem', fontWeight:600 }}>
          <Filter size={13} /> Filters
        </div>
        <div style={{ flex:'1 1 180px', minWidth:150 }}>
          <label>Subject</label>
          <select className="select" value={filters.subject_id} onChange={e => setFilters(f => ({ ...f, subject_id: e.target.value }))}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label>From</label>
          <input type="date" className="input" style={{ width:160 }} value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label>To</label>
          <input type="date" className="input" style={{ width:160 }} value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ subject_id:'', from:'', to:'' })}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div style={{ padding:'2rem', display:'flex', flexDirection:'column', gap:10 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height:40 }} />)}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Subject</th>
                <th>Code</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td><span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.8rem' }}>{r.date}</span></td>
                  <td><span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.78rem', color:'var(--text-muted)' }}>
                    {r.time?.split('T')[1]?.slice(0,8) || '—'}
                  </span></td>
                  <td style={{ fontWeight:500 }}>{r.subjectName}</td>
                  <td><span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.78rem', color:'var(--jade2)' }}>{r.subjectCode}</span></td>
                  <td><span className={`badge badge-${r.status?.toLowerCase()}`}>{r.status}</span></td>
                  <td><span className="badge badge-neutral" style={{ textTransform:'capitalize', fontSize:'0.72rem' }}>
                    {r.method?.replace('_',' ')}
                  </span></td>
                </tr>
              ))}
              {!records.length && (
                <tr><td colSpan={6}>
                  <div className="empty-state">No attendance records found</div>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
