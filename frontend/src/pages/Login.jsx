import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ScanFace } from 'lucide-react';

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome, ${u.name.split(' ')[0]}!`);
      navigate('/teacher');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Login failed. Check your credentials.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>

      {/* Left decorative panel */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between',
        padding:'3rem', position:'relative', overflow:'hidden',
        background:'linear-gradient(145deg,#0c1f19,#090e0b)',
        borderRight:'1px solid var(--border)',
      }}>
        <div style={{ position:'absolute', inset:0, opacity:0.07,
          backgroundImage:'radial-gradient(circle,rgba(22,160,107,0.8)1px,transparent 1px)',
          backgroundSize:'26px 26px' }} />
        <div style={{ position:'absolute', width:360, height:360, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(22,160,107,0.18)0%,transparent 70%)',
          top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          filter:'blur(40px)', pointerEvents:'none' }} />

        {/* Logo */}
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, background:'var(--jade)', borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ScanFace size={20} color="#fff" />
          </div>
          <span style={{ fontFamily:'Playfair Display,serif', fontSize:'1.25rem',
            fontWeight:700, color:'#fff' }}>VISIO</span>
        </div>

        {/* Hero text */}
        <div style={{ position:'relative' }}>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'2.6rem',
            lineHeight:1.15, fontWeight:700, color:'#e8f5f0', margin:'0 0 1rem' }}>
            Face-Powered<br />
            <span style={{ color:'var(--jade2)' }}>Attendance,</span><br />
            Reimagined.
          </h1>
          <p style={{ color:'rgba(228,228,240,0.5)', fontSize:'0.9rem',
            lineHeight:1.7, maxWidth:340, margin:0 }}>
            Automated, accurate, and effortless. AI facial recognition integrated with your classroom setup.
          </p>
        </div>

        {/* Stats */}
        <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          {[['⚡','Real-time','Live detection'],['🔒','Secure','JWT + Firebase'],['⏱','< 2 sec','Per student']].map(([icon,lbl,sub]) => (
            <div key={lbl} style={{ padding:'12px 10px', borderRadius:10,
              background:'rgba(22,160,107,0.07)', border:'1px solid rgba(22,160,107,0.15)' }}>
              <div style={{ fontSize:'14px', marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#e8f5f0' }}>{lbl}</div>
              <div style={{ fontSize:'0.72rem', color:'rgba(228,228,240,0.4)', marginTop:2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div style={{ width:480, display:'flex', alignItems:'center',
        justifyContent:'center', padding:'2.5rem' }}>
        <div style={{ width:'100%', maxWidth:380 }} className="slide-up">

          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'2.5rem' }}>
            <div style={{ width:34, height:34, background:'var(--jade)', borderRadius:9,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ScanFace size={17} color="#fff" />
            </div>
            <span style={{ fontFamily:'Playfair Display,serif', fontSize:'1rem', fontWeight:700 }}>
              VISIO
            </span>
          </div>

          <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.8rem',
            fontWeight:600, margin:'0 0 0.3rem' }}>Teacher Sign In</h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', margin:'0 0 2rem' }}>
            Access the attendance management portal
          </p>

          {errorMsg && (
            <div style={{ background:'rgba(224,82,82,0.12)', border:'1px solid rgba(224,82,82,0.3)',
              borderRadius:9, padding:'10px 14px', marginBottom:'1.25rem',
              fontSize:'0.82rem', color:'var(--red)' }}>
              ⚠ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'1rem' }}>
              <label>Email</label>
              <input className="input" type="email" placeholder="teacher@school.edu"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required />
            </div>
            <div style={{ marginBottom:'1.5rem', position:'relative' }}>
              <label>Password</label>
              <input className="input" type={showPw ? 'text' : 'password'}
                placeholder="••••••••" style={{ paddingRight:'2.75rem' }}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position:'absolute', right:12, bottom:10, background:'none',
                  border:'none', cursor:'pointer', color:'var(--text-muted)', padding:0 }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" className="btn btn-primary"
              disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'0.75rem', fontSize:'0.9rem' }}>
              {loading
                ? <><span className="spinner" /> Signing in…</>
                : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop:'2rem', padding:'1rem', borderRadius:10,
            background:'var(--surface2)', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--jade2)',
              textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6 }}>
              Default demo credentials
            </div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', lineHeight:1.7 }}>
              Email: <span style={{ color:'var(--text)', fontFamily:'monospace' }}>teacher@school.edu</span><br />
              Password: <span style={{ color:'var(--text)', fontFamily:'monospace' }}>teacher123</span>
            </div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginTop:6 }}>
              Run <code style={{ background:'var(--surface3)', padding:'1px 6px', borderRadius:4,
                fontSize:'0.7rem' }}>node seed.js</code> in the backend folder first.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
