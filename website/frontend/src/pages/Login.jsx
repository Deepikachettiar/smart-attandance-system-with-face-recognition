import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ScanFace } from 'lucide-react';

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode,    setMode]    = useState('signin'); // 'signin' | 'signup'
  const [form,    setForm]    = useState({ name:'', email:'', password:'' });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        await signup(form.name, form.email, form.password);
        toast.success('Account created! Welcome.');
      } else {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      }
      navigate('/teacher');
    } catch (err) {
      const msg = {
        'auth/user-not-found':    'No account found with that email.',
        'auth/wrong-password':    'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password':     'Password must be at least 6 characters.',
        'auth/invalid-email':     'Invalid email address.',
        'auth/invalid-credential': 'Invalid email or password.',
      }[err.code] || err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>

      {/* Left panel */}
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

        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, background:'var(--jade)', borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ScanFace size={20} color="#fff" />
          </div>
          <span style={{ fontFamily:'Playfair Display,serif', fontSize:'1.25rem',
            fontWeight:700, color:'#fff' }}>AttendAI</span>
        </div>

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

        <div style={{ position:'relative', display:'grid',
          gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          {[['⚡','Real-time','Live detection'],
            ['🔒','Secure','Firebase Auth'],
            ['⏱','< 2 sec','Per student']].map(([icon,lbl,sub]) => (
            <div key={lbl} style={{ padding:'12px 10px', borderRadius:10,
              background:'rgba(22,160,107,0.07)',
              border:'1px solid rgba(22,160,107,0.15)' }}>
              <div style={{ fontSize:'14px', marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#e8f5f0' }}>{lbl}</div>
              <div style={{ fontSize:'0.72rem', color:'rgba(228,228,240,0.4)', marginTop:2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width:480, display:'flex', alignItems:'center',
        justifyContent:'center', padding:'2.5rem' }}>
        <div style={{ width:'100%', maxWidth:380 }} className="slide-up">

          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'2.5rem' }}>
            <div style={{ width:34, height:34, background:'var(--jade)', borderRadius:9,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ScanFace size={17} color="#fff" />
            </div>
            <span style={{ fontFamily:'Playfair Display,serif', fontSize:'1rem', fontWeight:700 }}>
              AttendAI
            </span>
          </div>

          {/* Toggle tabs */}
          <div style={{ display:'flex', background:'var(--surface2)',
            borderRadius:10, padding:4, marginBottom:'1.75rem',
            border:'1px solid var(--border)' }}>
            {['signin','signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex:1, padding:'8px', borderRadius:7, border:'none',
                  cursor:'pointer', fontSize:'0.85rem', fontWeight:600,
                  transition:'all 0.2s',
                  background: mode === m ? 'var(--jade)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                }}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.6rem',
            fontWeight:600, margin:'0 0 0.3rem' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', margin:'0 0 1.5rem' }}>
            {mode === 'signin'
              ? 'Sign in to your teacher portal'
              : 'Register as a new teacher'}
          </p>

          {error && (
            <div style={{ background:'rgba(224,82,82,0.12)',
              border:'1px solid rgba(224,82,82,0.3)', borderRadius:9,
              padding:'10px 14px', marginBottom:'1.25rem',
              fontSize:'0.82rem', color:'var(--red)' }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div style={{ marginBottom:'1rem' }}>
                <label>Full Name</label>
                <input className="input" type="text" placeholder="Dr. John Smith"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required />
              </div>
            )}
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
                style={{ position:'absolute', right:12, bottom:10,
                  background:'none', border:'none', cursor:'pointer',
                  color:'var(--text-muted)', padding:0 }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" className="btn btn-primary"
              disabled={loading}
              style={{ width:'100%', justifyContent:'center',
                padding:'0.75rem', fontSize:'0.9rem' }}>
              {loading
                ? <><span className="spinner" /> {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:'0.8rem',
            color:'var(--text-muted)', marginTop:'1.5rem' }}>
            {mode === 'signin'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              style={{ background:'none', border:'none', color:'var(--jade2)',
                cursor:'pointer', fontWeight:600, fontSize:'0.8rem' }}>
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}