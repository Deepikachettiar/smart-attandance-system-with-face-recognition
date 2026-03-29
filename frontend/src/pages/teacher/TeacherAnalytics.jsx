import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, downloadCSV } from '../../utils/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

const JADE  = '#1ec980';
const RED   = '#e05252';
const AMBER = '#e8a22a';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 14px', fontSize:'0.82rem' }}>
      <div style={{ color:'var(--text-muted)', marginBottom:6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom:2 }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

export default function TeacherAnalytics() {
  const [params] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [selSub,   setSelSub]   = useState(params.get('subject') || '');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  useEffect(() => {
    api.getTeacherSubjects().then(r => {
      setSubjects(r.data);
      if (!selSub && r.data.length) setSelSub(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selSub) return;
    setLoading(true);
    api.getAnalytics(selSub)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [selSub]);

  const handleExport = async () => {
    if (!selSub) return;
    try {
      const r = await api.exportAttendance(selSub, { from: dateFrom, to: dateTo });
      downloadCSV(r.data.rows, `${r.data.subject.code}_attendance.csv`);
      toast.success('Exported!');
    } catch { toast.error('Export failed'); }
  };

  const pieData = data ? [
    { name:'Present', value: data.stats.reduce((a,s)=>a+s.present,0), fill: JADE  },
    { name:'Absent',  value: data.stats.reduce((a,s)=>a+s.absent, 0), fill: RED   },
    { name:'Late',    value: data.stats.reduce((a,s)=>a+s.late,   0), fill: AMBER },
  ] : [];

  const dailyChart = data
    ? [...data.daily].reverse().slice(-20).map(d => ({ date: d.date.slice(5), Present:d.present, Absent:d.absent, Late:d.late }))
    : [];

  const distributionData = data
    ? [
        { range:'< 50%', count: data.stats.filter(s=>s.percentage<50).length },
        { range:'50-74%', count: data.stats.filter(s=>s.percentage>=50&&s.percentage<75).length },
        { range:'75-89%', count: data.stats.filter(s=>s.percentage>=75&&s.percentage<90).length },
        { range:'≥ 90%',  count: data.stats.filter(s=>s.percentage>=90).length },
      ]
    : [];

  return (
    <div className="page slide-up">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.8rem', fontWeight:600, margin:0 }}>Analytics</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.867rem', marginTop:4 }}>Attendance insights per subject</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div>
            <label style={{ fontSize:'0.72rem' }}>From</label>
            <input type="date" className="input" style={{ width:145 }} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:'0.72rem' }}>To</label>
            <input type="date" className="input" style={{ width:145 }} value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={!selSub}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Subject selector */}
      <div className="card card-body" style={{ marginBottom:'1.5rem' }}>
        <label>Select Subject</label>
        <select className="select" style={{ maxWidth:340 }} value={selSub} onChange={e => setSelSub(e.target.value)}>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
        </select>
      </div>

      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height:280 }} />)}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Top KPI row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:'1.5rem' }}>
            {[
              { label:'Total Students',   val: data.stats.length },
              { label:'Below 75%',        val: data.stats.filter(s=>s.percentage<75).length, col:'var(--red)' },
              { label:'Avg Attendance',   val: `${Math.round(data.stats.reduce((a,s)=>a+s.percentage,0)/(data.stats.length||1))}%` },
              { label:'Sessions Recorded',val: data.daily.length },
            ].map(({ label, val, col }) => (
              <div key={label} className="card card-body">
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
                <div style={{ fontFamily:'Playfair Display, serif', fontSize:'1.9rem', fontWeight:700, color: col||'var(--jade2)' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Charts row 1 */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:'1.5rem' }}>
            {/* Daily trend */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight:600, fontSize:'0.9rem' }}>Daily Attendance Trend</span>
              </div>
              <div style={{ padding:'1.25rem' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyChart} barSize={10} barGap={2}>
                    <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="Present" fill={JADE}  radius={[3,3,0,0]} />
                    <Bar dataKey="Absent"  fill={RED}   radius={[3,3,0,0]} />
                    <Bar dataKey="Late"    fill={AMBER} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie */}
            <div className="card">
              <div className="card-header"><span style={{ fontWeight:600, fontSize:'0.9rem' }}>Overall Split</span></div>
              <div style={{ padding:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, fontSize:'0.82rem' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:'0.78rem', color:'var(--text-muted)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Distribution chart */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:14, marginBottom:'1.5rem' }}>
            <div className="card">
              <div className="card-header"><span style={{ fontWeight:600, fontSize:'0.9rem' }}>Attendance Distribution</span></div>
              <div style={{ padding:'1.25rem' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={distributionData} layout="vertical" barSize={16}>
                    <XAxis type="number" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="range" type="category" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="count" radius={[0,4,4,0]}>
                      {distributionData.map((d, i) => <Cell key={i} fill={['var(--red)','var(--amber)','var(--jade2)','#818cf8'][i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend line */}
            <div className="card">
              <div className="card-header"><span style={{ fontWeight:600, fontSize:'0.9rem' }}>Present % Over Time</span></div>
              <div style={{ padding:'1.25rem' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailyChart}>
                    <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0,'auto']} tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Present" stroke={JADE} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Per-student table */}
          <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.1rem', fontWeight:600, marginBottom:'1rem' }}>Student Breakdown</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Total</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.stats.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:500 }}>{s.name}</td>
                    <td><span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.78rem', color:'var(--text-muted)' }}>{s.roll_no}</span></td>
                    <td style={{ color:'var(--jade2)' }}>{s.present}</td>
                    <td style={{ color:'var(--red)' }}>{s.absent}</td>
                    <td style={{ color:'var(--amber)' }}>{s.late}</td>
                    <td style={{ color:'var(--text-muted)' }}>{s.total}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ flex:1, height:5, background:'var(--surface3)', borderRadius:3, overflow:'hidden', maxWidth:80 }}>
                          <div style={{ width:`${s.percentage}%`, height:'100%', background: s.percentage>=75?'var(--jade2)':'var(--red)', borderRadius:3, transition:'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize:'0.82rem', fontWeight:600, color: s.percentage>=75?'var(--jade2)':'var(--red)', minWidth:36 }}>{s.percentage}%</span>
                      </div>
                    </td>
                    <td>
                      {s.percentage < 75
                        ? <span className="badge badge-absent">⚠ At Risk</span>
                        : <span className="badge badge-present">✓ Good</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
