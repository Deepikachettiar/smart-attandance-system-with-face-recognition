import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Download } from 'lucide-react';

function parseCsvText(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

export default function ImportCSV() {
  const [subjects,   setSubjects]   = useState([]);
  const [selSubject, setSelSubject] = useState('');
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [parsed,     setParsed]     = useState(null);
  const [filename,   setFilename]   = useState('');
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    api.getTeacherSubjects().then(r => {
      setSubjects(r.data);
      if (r.data.length) setSelSubject(r.data[0].id);
    });
  }, []);

  const processFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file'); return;
    }
    setFilename(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCsvText(e.target.result);
      if (!rows.length) { toast.error('CSV is empty or invalid'); return; }
      // Validate expected columns: Name, Date, Time, Status
      const keys = Object.keys(rows[0]);
      const hasName = keys.some(k => k.toLowerCase() === 'name');
      if (!hasName) { toast.error('CSV must have a "Name" column'); return; }
      setParsed(rows);
      toast.success(`Parsed ${rows.length} records from CSV`);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!parsed || !selSubject || !date) {
      toast.error('Select subject, date and upload a file'); return;
    }
    setImporting(true);
    try {
      const r = await api.importCSV({ records: parsed, subject_id: selSubject, date });
      setResult(r.data);
      toast.success(`Imported ${r.data.imported} records!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => { setParsed(null); setFilename(''); setResult(null); if (inputRef.current) inputRef.current.value = ''; };

  // Download sample CSV template
  const downloadSample = () => {
    const csv = 'Name,Date,Time,Status\nArjun Mehta,2024-03-15,09:05:00,Present\nSneha Patel,2024-03-15,09:07:00,Present\nVikram Singh,2024-03-15,,Absent';
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download='attendance_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page slide-up">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.8rem', fontWeight:600, margin:0 }}>Import from CSV</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.867rem', marginTop:4 }}>
            Import face-recognition attendance output (Name, Date, Time, Status)
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={downloadSample}>
          <Download size={14} /> Sample Template
        </button>
      </div>

      {/* Config */}
      <div className="card card-body" style={{ display:'flex', flexWrap:'wrap', gap:14, alignItems:'flex-end', marginBottom:'1.5rem' }}>
        <div style={{ flex:'1 1 220px' }}>
          <label>Subject</label>
          <select className="select" value={selSubject} onChange={e => setSelSubject(e.target.value)}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>
        </div>
        <div>
          <label>Attendance Date</label>
          <input type="date" className="input" style={{ width:180 }} value={date}
            onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !parsed && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--jade2)' : parsed ? 'var(--jade-border)' : 'var(--border2)'}`,
          borderRadius:14, padding:'2.5rem',
          textAlign:'center', cursor: parsed ? 'default' : 'pointer',
          background: dragging ? 'var(--jade-bg)' : parsed ? 'rgba(22,160,107,0.04)' : 'var(--surface)',
          transition:'all 0.2s', marginBottom:'1.5rem',
        }}>
        <input ref={inputRef} type="file" accept=".csv" style={{ display:'none' }}
          onChange={e => processFile(e.target.files[0])} />

        {!parsed ? (
          <>
            <Upload size={32} style={{ color:'var(--text-muted)', marginBottom:12 }} />
            <div style={{ fontWeight:600, marginBottom:6 }}>Drop your CSV file here</div>
            <div style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>or click to browse • .csv files only</div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-dim)', marginTop:8 }}>
              Expected columns: <span style={{ fontFamily:'JetBrains Mono, monospace', color:'var(--jade2)' }}>Name, Date, Time, Status</span>
            </div>
          </>
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
            <FileText size={28} style={{ color:'var(--jade2)' }} />
            <div style={{ textAlign:'left' }}>
              <div style={{ fontWeight:600 }}>{filename}</div>
              <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:2 }}>{parsed.length} records loaded</div>
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={handleClear} style={{ marginLeft:8 }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Preview */}
      {parsed && (
        <>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
            <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.1rem', fontWeight:600, margin:0 }}>
              Preview ({parsed.length} rows)
            </h2>
            <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? <span className="spinner" /> : <><Upload size={14} /> Import to Firebase</>}
            </button>
          </div>

          <div className="table-wrap" style={{ marginBottom:'1.5rem' }}>
            <table>
              <thead>
                <tr>
                  {Object.keys(parsed[0]).map(k => <th key={k}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 15).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j}>
                        {j === Object.keys(row).findIndex(k => k.toLowerCase() === 'status')
                          ? <span className={`badge badge-${v?.toLowerCase?.()}`}>{v || '—'}</span>
                          : <span style={{ fontFamily: ['Date','Time'].includes(Object.keys(row)[j]) ? 'JetBrains Mono, monospace' : 'inherit', fontSize:'0.85rem' }}>{v || '—'}</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 15 && (
              <div style={{ padding:'0.75rem 1rem', textAlign:'center', fontSize:'0.82rem', color:'var(--text-muted)', borderTop:'1px solid var(--border)' }}>
                … and {parsed.length - 15} more rows
              </div>
            )}
          </div>
        </>
      )}

      {/* Result */}
      {result && (
        <div className="card card-body" style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CheckCircle size={20} style={{ color:'var(--jade2)' }} />
            <div>
              <div style={{ fontWeight:600 }}>Import Complete</div>
              <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:2 }}>
                {result.imported} records saved to Firebase
              </div>
            </div>
          </div>
          {result.notFound?.length > 0 && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, flex:1 }}>
              <AlertTriangle size={18} style={{ color:'var(--amber)', flexShrink:0, marginTop:2 }} />
              <div>
                <div style={{ fontWeight:600, color:'var(--amber)', fontSize:'0.9rem' }}>
                  {result.notFound.length} names not matched
                </div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:4 }}>
                  {result.notFound.join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="card" style={{ marginTop:'1.5rem' }}>
        <div className="card-header"><span style={{ fontWeight:600, fontSize:'0.9rem' }}>How it works</span></div>
        <div className="card-body" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
          {[
            { step:'1', title:'Run face recognition', desc:'Your Python OpenCV script marks attendance and exports a CSV with Name, Date, Time, Status columns.' },
            { step:'2', title:'Upload the CSV here', desc:'Drag and drop the exported CSV file. Preview the data before importing.' },
            { step:'3', title:'Sync to Firebase', desc:'Records are matched by student name and saved to the database. Unmatched names are flagged.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ display:'flex', gap:12 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--jade-bg)', border:'1px solid var(--jade-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'0.78rem', fontWeight:700, color:'var(--jade2)' }}>{step}</div>
              <div>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:4 }}>{title}</div>
                <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', lineHeight:1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
