import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ScanFace, Zap, Shield, Clock } from 'lucide-react';

const DEMOS = [
  { role: 'Teacher', email: 'teacher@school.edu', password: 'teacher123', color: 'var(--jade)' },
  { role: 'Student', email: 'arjun@student.edu',  password: 'student123', color: 'var(--blue)'  },
];

export default function Login() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome, ${u.name.split(' ')[0]}!`);
      navigate(u.role === 'teacher' ? '/teacher' : '/student');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '3rem', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0c1f19 0%, #090e0b 100%)',
        borderRight: '1px solid var(--border)',
      }} className="hidden-mobile">
        {/* Glowing orb */}
        <div style={{
          position:'absolute', width:400, height:400, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(22,160,107,0.18) 0%, transparent 70%)',
          top:'50%', left:'50%', transform:'translate(-50%,-50%)', filter:'blur(40px)', pointerEvents:'none',
        }} />
        {/* Dot grid */}
        <div style={{
          position:'absolute', inset:0, opacity:0.08,
          backgroundImage:'radial-gradient(circle, rgba(22,160,107,0.8) 1px, transparent 1px)',
          backgroundSize:'28px 28px',
        }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, background:'var(--jade)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ScanFace size={20} color="#fff" />
            </div>
            <span style={{ fontFamily:'Playfair Display, serif', fontSize:'1.2rem', fontWeight:700, color:'#fff' }}>AttendAI</span>
          </div>
        </div>

        <div style={{ position:'relative', zIndex:1 }}>
          <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'2.8rem', lineHeight:1.15, fontWeight:700, color:'#e8f5f0', margin:'0 0 1.25rem' }}>
            Face-Powered<br />
            <span style={{ color:'var(--jade2)' }}>Attendance,</span><br />
            Reimagined.
          </h1>
          <p style={{ color:'rgba(228,228,240,0.5)', fontSize:'0.95rem', lineHeight:1.7, maxWidth:340 }}>
            Instantly mark attendance using AI facial recognition. Accurate, auditable, and built for modern classrooms.
          </p>
        </div>

        <div style={{ position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          {[
            { icon: Zap,    label:'Real-time', sub:'Live detection' },
            { icon: Shield, label:'Secure',    sub:'JWT + Firebase' },
            { icon: Clock,  label:'< 2 sec',   sub:'Per student'   },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} style={{ padding:'14px 12px', borderRadius:10, background:'rgba(22,160,107,0.07)', border:'1px solid rgba(22,160,107,0.15)' }}>
              <Icon size={16} color="var(--jade2)" style={{ marginBottom:6 }} />
              <div style={{ fontSize:'0.82rem', fontWeight:700, color:'#e8f5f0' }}>{label}</div>
              <div style={{ fontSize:'0.73rem', color:'rgba(228,228,240,0.45)', marginTop:2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ width: 480, display:'flex', alignItems:'center', justifyContent:'center', padding:'2.5rem' }} className="fade-in">
        <div style={{ width:'100%', maxWidth:400 }}>

          {/* Mobile logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'2.5rem' }}>
            <div style={{ width:36, height:36, background:'var(--jade)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ScanFace size={18} color="#fff" />
            </div>
            <span style={{ fontFamily:'Playfair Display, serif', fontSize:'1.1rem', fontWeight:700 }}>AttendAI</span>
          </div>

          <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.9rem', fontWeight:600, margin:'0 0 0.35rem' }}>Sign in</h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.867rem', margin:'0 0 2rem' }}>Access your attendance portal</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'1rem' }}>
              <label>Email</label>
              <input className="input" type="email" placeholder="you@school.edu"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div style={{ marginBottom:'1.5rem', position:'relative' }}>
              <label>Password</label>
              <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ paddingRight:'2.75rem' }} required />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{
                position:'absolute', right:12, bottom:10, background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:0,
              }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'0.75rem' }}>
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ margin:'2rem 0 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1rem' }}>
              <div className="divider" style={{ flex:1 }} />
              <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>Demo accounts</span>
              <div className="divider" style={{ flex:1 }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {DEMOS.map(d => (
                <button key={d.role} onClick={() => setForm({ email: d.email, password: d.password })}
                  style={{
                    background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10,
                    padding:'12px 14px', textAlign:'left', cursor:'pointer', transition:'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color: d.color, marginBottom:4 }}>{d.role}</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', lineHeight:1.6 }}>{d.email}<br />{d.password}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
