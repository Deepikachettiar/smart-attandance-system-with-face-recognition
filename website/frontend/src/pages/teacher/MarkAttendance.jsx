import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import { Save, RefreshCw, CheckCheck, X } from 'lucide-react';

const STATUS_OPTS = ['Present', 'Absent', 'Late'];
const STATUS_COL  = { Present: 'var(--jade2)', Absent: 'var(--red)', Late: 'var(--amber)', 'Not Marked': 'var(--text-muted)' };
const STATUS_CLS  = { Present: 'badge-present', Absent: 'badge-absent', Late: 'badge-late', 'Not Marked': 'badge-neutral' };

export default function MarkAttendance() {
  const [params] = useSearchParams();
  const [subjects,  setSubjects]  = useState([]);
  const [selSubject, setSelSubject] = useState(params.get('subject') || '');
  const [date,      setDate]      = useState(params.get('date') || new Date().toISOString().split('T')[0]);
  const [classData, setClassData] = useState(null);
  const [overrides, setOverrides] = useState({});   // { studentId: status }
  const [saving,    setSaving]    = useState(false);
  const [loadingClass, setLoadingClass] = useState(false);

  useEffect(() => {
    api.getTeacherSubjects().then(r => {
      setSubjects(r.data);
      if (!selSubject && r.data.length) setSelSubject(r.data[0].id);
    });
  }, []);

  const loadClass = useCallback(() => {
    if (!selSubject) return;
    setLoadingClass(true);
    setOverrides({});
    api.getClassAttendance(selSubject, date)
      .then(r => setClassData(r.data))
      .catch(() => toast.error('Failed to load class'))
      .finally(() => setLoadingClass(false));
  }, [selSubject, date]);

  useEffect(() => { loadClass(); }, [loadClass]);

  const setStatus = (studentId, status) =>
    setOverrides(o => ({ ...o, [studentId]: status }));

  const markAll = (status) => {
    if (!classData) return;
    const next = {};
    classData.students.forEach(s => { next[s.id] = status; });
    setOverrides(next);
  };

  const getEffectiveStatus = (s) => overrides[s.id] || s.status;

  const handleSave = async () => {
    if (!classData) return;
    // Only save entries that have been explicitly set or already existed
    const toSave = classData.students.map(s => ({
      student_id: s.id,
      name: s.name,
      studentId: s.studentId,
      status: overrides[s.id] || (s.status !== 'Not Marked' ? s.status : null),
    })).filter(r => r.status);

    if (!toSave.length) { toast.error('No attendance to save'); return; }

    setSaving(true);
    try {
      await api.bulkMark({
        subject_id: selSubject,
        date,
        records: toSave.map(r => ({ student_id: r.student_id, name: r.name, studentId: r.studentId, status: r.status, method: 'manual' })),
      });
      toast.success(`Saved attendance for ${toSave.length} students`);
      loadClass();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const stats = classData ? {
    present: classData.students.filter(s => getEffectiveStatus(s) === 'Present').length,
    absent:  classData.students.filter(s => getEffectiveStatus(s) === 'Absent').length,
    late:    classData.students.filter(s => getEffectiveStatus(s) === 'Late').length,
    unmarked:classData.students.filter(s => getEffectiveStatus(s) === 'Not Marked').length,
  } : null;

  return (
    <div className="page slide-up">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.8rem', fontWeight:600, margin:0 }}>Mark Attendance</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.867rem', marginTop:4 }}>Select a subject and date, then mark each student</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadClass} disabled={loadingClass}>
            <RefreshCw size={14} className={loadingClass ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !classData}>
            {saving ? <span className="spinner" /> : <><Save size={14} /> Save All</>}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card card-body" style={{ display:'flex', flexWrap:'wrap', gap:14, alignItems:'flex-end', marginBottom:'1.5rem' }}>
        <div style={{ flex:'1 1 220px' }}>
          <label>Subject</label>
          <select className="select" value={selSubject} onChange={e => setSelSubject(e.target.value)}>
            <option value="">Select subject...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>
        </div>
        <div>
          <label>Date</label>
          <input type="date" className="input" style={{ width:180 }} value={date}
            onChange={e => setDate(e.target.value)} />
        </div>

        {classData && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', alignSelf:'center', marginRight:4 }}>Mark all:</span>
            {STATUS_OPTS.map(st => (
              <button key={st} className={`btn btn-sm`}
                style={{ background:`color-mix(in srgb, ${STATUS_COL[st]} 12%, transparent)`, color:STATUS_COL[st], border:`1px solid color-mix(in srgb, ${STATUS_COL[st]} 25%, transparent)` }}
                onClick={() => markAll(st)}>
                <CheckCheck size={13} /> All {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary bar */}
      {stats && (
        <div style={{ display:'flex', gap:10, marginBottom:'1.25rem' }}>
          {[['Present','present',stats.present],['Absent','absent',stats.absent],['Late','late',stats.late],['Unmarked','neutral',stats.unmarked]].map(([lbl,cls,val]) => (
            <span key={lbl} className={`badge badge-${cls}`} style={{ fontSize:'0.82rem', padding:'0.3rem 0.875rem' }}>
              {val} {lbl}
            </span>
          ))}
          <span style={{ fontSize:'0.8rem', color:'var(--text-muted)', alignSelf:'center', marginLeft:'auto' }}>
            {classData?.students?.length} students
          </span>
        </div>
      )}

      {/* Student list */}
      {loadingClass ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height:56 }} />)}
        </div>
      ) : classData ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Roll No</th>
                <th>Current</th>
                <th>Mark As</th>
              </tr>
            </thead>
            <tbody>
              {classData.students.map((s, i) => {
                const effective = getEffectiveStatus(s);
                const changed   = overrides[s.id] && overrides[s.id] !== s.status;
                return (
                  <tr key={s.id} style={changed ? { background:'rgba(22,160,107,0.04)' } : {}}>
                    <td style={{ color:'var(--text-muted)', fontSize:'0.8rem', width:40 }}>{i+1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:700, color:'var(--jade2)', flexShrink:0 }}>
                          {s.name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight:500, fontSize:'0.9rem' }}>{s.name}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.78rem', color:'var(--text-muted)' }}>{s.studentId}</span></td>
                    <td>
                      <span className={`badge badge-${effective?.toLowerCase?.() || 'neutral'} ${STATUS_CLS[effective]}`}>
                        {effective}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        {STATUS_OPTS.map(st => (
                          <button key={st} onClick={() => setStatus(s.id, st)}
                            className="btn btn-sm"
                            style={{
                              background: effective === st ? `color-mix(in srgb, ${STATUS_COL[st]} 18%, transparent)` : 'var(--surface2)',
                              color: effective === st ? STATUS_COL[st] : 'var(--text-muted)',
                              border: `1px solid ${effective === st ? `color-mix(in srgb, ${STATUS_COL[st]} 30%, transparent)` : 'var(--border)'}`,
                              minWidth: 70,
                              justifyContent: 'center',
                            }}>
                            {effective === st && <CheckCheck size={11} />}
                            {st}
                          </button>
                        ))}
                        {overrides[s.id] && (
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => {
                            setOverrides(o => { const n = {...o}; delete n[s.id]; return n; });
                          }} title="Reset">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)' }}>
          Select a subject to load students
        </div>
      )}
    </div>
  );
}
