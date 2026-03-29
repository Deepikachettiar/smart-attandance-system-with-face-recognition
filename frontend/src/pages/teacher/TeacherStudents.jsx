import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { Search } from 'lucide-react';

export default function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.getAllStudents()
      .then(r => setStudents(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page slide-up">
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.8rem', fontWeight:600, margin:0 }}>Students</h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.867rem', marginTop:4 }}>{students.length} enrolled students</p>
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:400, marginBottom:'1.5rem' }}>
        <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
        <input className="input" style={{ paddingLeft:36 }} placeholder="Search by name, roll no, email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height:52 }} />)}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Roll No</th>
                <th>Email</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  <td style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>{i+1}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:700, color:'var(--jade2)', flexShrink:0 }}>
                        {s.name[0]}
                      </div>
                      <span style={{ fontWeight:500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td><span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.8rem', color:'var(--jade2)' }}>{s.studentId || '—'}</span></td>
                  <td style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{s.email}</td>
                  <td style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>
                    {s.createdAt ? new Date(s.createdAt._seconds ? s.createdAt._seconds * 1000 : s.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={5}><div className="empty-state">No students found</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
