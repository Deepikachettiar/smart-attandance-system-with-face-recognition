import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { Link } from 'react-router-dom';
import { Users, BookOpen, CalendarCheck } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([api.getTeacherSubjects(), api.getAllStudents()])
      .then(([subs, studs]) => {
        setSubjects(subs.data);
        setStudents(studs.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  if (loading) return (
    <div className="page" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height:80 }} />)}
    </div>
  );

  return (
    <div className="page slide-up">
      {/* Header */}
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.8rem', fontWeight:600, margin:0 }}>
          Dashboard
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.867rem', marginTop:4 }}>
          {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:'2rem' }}>
        {[
          { label:'Subjects',  value: subjects.length, icon: BookOpen,      col:'var(--jade2)' },
          { label:'Students',  value: students.length, icon: Users,         col:'#818cf8'      },
          { label:'Today',     value: new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'}), icon: CalendarCheck, col:'var(--amber)' },
        ].map(({ label, value, icon: Icon, col }) => (
          <div key={label} className="card card-body"
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
              <div style={{ fontFamily:'Playfair Display, serif', fontSize:'2rem', fontWeight:700, color:col }}>
                {value}
              </div>
            </div>
            <div style={{ width:36, height:36, borderRadius:9,
              background:`color-mix(in srgb, ${col} 14%, transparent)`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={17} color={col} />
            </div>
          </div>
        ))}
      </div>

      {/* Subject cards */}
      <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.15rem', fontWeight:600, marginBottom:'1rem' }}>
        Your Subjects
      </h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {subjects.map(s => (
          <div key={s.id} className="card card-body">
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.75rem',
                color:'var(--jade2)', marginBottom:4 }}>
                {s.code}
              </div>
              <div style={{ fontWeight:600, fontSize:'0.9rem', lineHeight:1.3 }}>
                {s.name}
              </div>
            </div>
            <Link
              to={`/teacher/mark?subject=${s.id}&date=${today}`}
              className="btn btn-primary btn-sm"
              style={{ width:'100%', justifyContent:'center' }}>
              Mark Today
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}