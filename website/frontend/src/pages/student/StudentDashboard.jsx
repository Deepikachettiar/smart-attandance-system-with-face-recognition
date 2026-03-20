import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { TrendingUp, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

function RadialProgress({ pct }) {
  const r = 28, c = 2 * Math.PI * r;
  const col = pct >= 75 ? 'var(--jade2)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <svg width={70} height={70} viewBox="0 0 70 70">
      <circle cx={35} cy={35} r={r} fill="none" stroke="var(--surface3)" strokeWidth={5} />
      <circle cx={35} cy={35} r={r} fill="none" stroke={col} strokeWidth={5}
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" transform="rotate(-90 35 35)"
        style={{ transition: 'stroke-dashoffset 0.9s ease' }} />
      <text x={35} y={39} textAnchor="middle" fill={col} fontSize={11} fontWeight={700} fontFamily="DM Sans">{pct}%</text>
    </svg>
  );
}

export default function StudentDashboard() {
  const { user }   = useAuth();
  const [summary, setSummary] = useState([]);
  const [recent, setRecent]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStudentSummary(user.id), api.getStudentAttendance(user.id, {})])
      .then(([s, r]) => { setSummary(s.data); setRecent(r.data.slice(0, 8)); })
      .finally(() => setLoading(false));
  }, [user.id]);

  const totPresent = summary.reduce((a, s) => a + s.present, 0);
  const totClasses = summary.reduce((a, s) => a + s.total,   0);
  const overall    = totClasses ? Math.round(100 * totPresent / totClasses) : 0;
  const atRisk     = summary.filter(s => s.percentage < 75).length;

  if (loading) return (
    <div className="page slide-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height:96 }} />)}
    </div>
  );

  return (
    <div className="page slide-up">
      {/* Header */}
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.8rem', fontWeight:600, margin:0 }}>
          Hello, {user.name.split(' ')[0]} 👋
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.867rem', marginTop:4 }}>
          Roll No: <span style={{ fontFamily:'JetBrains Mono, monospace', color:'var(--jade2)', fontSize:'0.8rem' }}>{user.studentId}</span>
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:'2rem' }}>
        {[
          { label:'Overall', value:`${overall}%`, icon:TrendingUp,    col: overall>=75?'var(--jade2)':'var(--red)' },
          { label:'Attended', value:totPresent,    icon:CheckCircle,   col:'var(--jade2)' },
          { label:'Missed',   value:totClasses-totPresent, icon:XCircle, col:'var(--red)' },
          { label:'At Risk',  value:atRisk,        icon:AlertTriangle, col:atRisk>0?'var(--amber)':'var(--jade2)' },
        ].map(({ label, value, icon: Icon, col }) => (
          <div key={label} className="card card-body" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
              <div style={{ fontFamily:'Playfair Display, serif', fontSize:'2rem', fontWeight:700, color:col }}>{value}</div>
            </div>
            <div style={{ width:36, height:36, borderRadius:9, background:`color-mix(in srgb, ${col} 14%, transparent)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={17} color={col} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:20 }}>
        {/* Subject summary */}
        <div>
          <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.1rem', fontWeight:600, marginBottom:'1rem' }}>Subject-wise Overview</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {summary.map(s => (
              <div key={s.subject_id} className="card card-body" style={{ display:'flex', alignItems:'center', gap:14 }}>
                <RadialProgress pct={s.percentage || 0} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'0.9rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.subject_name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>
                    <span style={{ fontFamily:'JetBrains Mono, monospace', color:'var(--jade2)' }}>{s.subject_code}</span>
                    {' · '}{s.present}/{s.total} classes
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                    <span className="badge badge-present">{s.present} Present</span>
                    <span className="badge badge-absent">{s.absent} Absent</span>
                    {s.late > 0 && <span className="badge badge-late">{s.late} Late</span>}
                  </div>
                </div>
                {s.percentage < 75 && (
                  <div className="badge badge-late" style={{ flexShrink:0, fontSize:'0.7rem' }}>⚠ Risk</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent records */}
        <div>
          <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.1rem', fontWeight:600, marginBottom:'1rem' }}>Recent Activity</h2>
          <div className="card" style={{ overflow:'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Code</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td><span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.78rem' }}>{r.date}</span></td>
                    <td style={{ color:'var(--jade2)', fontFamily:'JetBrains Mono, monospace', fontSize:'0.78rem' }}>{r.subjectCode}</td>
                    <td><span className={`badge badge-${r.status?.toLowerCase()}`}>{r.status}</span></td>
                  </tr>
                ))}
                {!recent.length && (
                  <tr><td colSpan={3} className="empty-state">No records yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
