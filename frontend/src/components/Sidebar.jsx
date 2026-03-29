import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ScanFace, LogOut, LayoutDashboard, CalendarCheck, Users, BarChart2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const LINKS = [
  { to:'/teacher',           end:true,  icon:LayoutDashboard, label:'Dashboard'        },
  { to:'/teacher/mark',      end:false, icon:CalendarCheck,   label:'Mark Attendance'  },
  { to:'/teacher/students',  end:false, icon:Users,           label:'Students'         },
  { to:'/teacher/analytics', end:false, icon:BarChart2,       label:'Analytics'        },
  { to:'/teacher/import',    end:false, icon:Upload,          label:'Import CSV'       },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); toast.success('Signed out'); navigate('/login'); };

  return (
    <aside style={{
      width:224, flexShrink:0, display:'flex', flexDirection:'column',
      height:'100vh', position:'sticky', top:0,
      background:'var(--surface)', borderRight:'1px solid var(--border)',
    }}>
      {/* Logo */}
      <div style={{ padding:'1.25rem', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, background:'var(--jade)', borderRadius:8,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ScanFace size={17} color="#fff" />
        </div>
        <div>
          <div style={{ fontFamily:'Playfair Display,serif', fontWeight:700,
            fontSize:'0.95rem', lineHeight:1.2 }}>VISIO</div>
          <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>Teacher Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'0.75rem', display:'flex', flexDirection:'column', gap:2 }}>
        {LINKS.map(({ to, end, icon:Icon, label }) => (
          <NavLink key={to} to={to} end={end}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:9,
              padding:'0.55rem 0.75rem', borderRadius:8,
              textDecoration:'none', fontSize:'0.853rem', fontWeight:500,
              transition:'all 0.15s',
              ...(isActive
                ? { background:'var(--jade-bg)', color:'var(--jade2)',
                    border:'1px solid var(--jade-border)' }
                : { background:'transparent', color:'var(--text-muted)',
                    border:'1px solid transparent' }),
            })}>
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding:'0.75rem', borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'0.6rem 0.75rem',
          borderRadius:8, background:'var(--surface2)', marginBottom:6 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--jade-bg)',
            border:'1px solid var(--jade-border)', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:'0.78rem', fontWeight:700,
            color:'var(--jade2)', flexShrink:0 }}>
            {user?.name?.[0]}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, overflow:'hidden',
              textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-muted)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:8,
            padding:'0.5rem 0.75rem', borderRadius:8, border:'none',
            background:'transparent', color:'var(--text-muted)', cursor:'pointer',
            fontSize:'0.82rem', fontWeight:500, transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(224,82,82,0.08)'; e.currentTarget.style.color='var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)'; }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
