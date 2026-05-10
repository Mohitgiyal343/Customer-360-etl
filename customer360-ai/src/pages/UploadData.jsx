import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, Database, Globe, CheckCircle, XCircle, Loader2, Eye, ChevronRight } from 'lucide-react'

const previewRows = [
  { id: 1, customer_id: 'CUST-001', name: 'Alice Johnson', email: 'alice@acme.com', revenue: 12400, segment: 'Enterprise', churn_risk: 0.12 },
  { id: 2, customer_id: 'CUST-002', name: 'Bob Chen', email: 'bob@startup.io', revenue: 3200, segment: 'Startup', churn_risk: 0.45 },
  { id: 3, customer_id: 'CUST-003', name: 'Carol Smith', email: 'carol@smb.co', revenue: 5800, segment: 'SMB', churn_risk: 0.28 },
  { id: 4, customer_id: 'CUST-004', name: 'David Park', email: 'd.park@corp.net', revenue: 18900, segment: 'Enterprise', churn_risk: 0.08 },
  { id: 5, customer_id: 'CUST-005', name: 'Eva Martinez', email: 'eva@consumer.com', revenue: 890, segment: 'Consumer', churn_risk: 0.67 },
]

const schemaFields = [
  { name: 'customer_id', type: 'VARCHAR', nullable: false, sample: 'CUST-001' },
  { name: 'name', type: 'VARCHAR', nullable: false, sample: 'Alice Johnson' },
  { name: 'email', type: 'VARCHAR', nullable: false, sample: 'alice@acme.com' },
  { name: 'revenue', type: 'FLOAT', nullable: true, sample: '12400.0' },
  { name: 'segment', type: 'VARCHAR', nullable: true, sample: 'Enterprise' },
  { name: 'churn_risk', type: 'FLOAT', nullable: true, sample: '0.12' },
]

const UploadTab = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} style={{
    display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10,
    border: active ? '1px solid rgba(0,212,255,0.4)' : '1px solid transparent',
    background: active ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
    color: active ? '#00d4ff' : 'var(--text-secondary)', cursor:'pointer',
    fontWeight: active ? 600 : 500, fontSize:14, transition:'all 0.2s'
  }}>
    <Icon size={16}/> {label}
  </button>
)

export default function UploadData() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('file')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [apiUrl, setApiUrl] = useState('')
  const [dbForm, setDbForm] = useState({ host:'', port:'5432', user:'', pass:'', db:'' })

  const onDrop = useCallback(accepted => {
    setFiles(accepted)
    setUploaded(false)
    simulateUpload()
  }, [])

  const simulateUpload = () => {
    setUploading(true)
    setTimeout(() => { setUploading(false); setUploaded(true) }, 2000)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv':[], 'application/json':[], 'application/vnd.ms-excel':[] }, multiple: false
  })

  return (
    <div>
      <div className="bg-orb bg-orb-blue" style={{ width:400, height:400, top:-100, right:0, opacity:0.3 }}/>

      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:700, marginBottom:6 }}><span className="gradient-text">Upload Data</span></h1>
        <p style={{ color:'var(--text-secondary)', fontSize:14 }}>Import data from files, APIs, or databases</p>
      </motion.div>

      {/* Source Tabs */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        style={{ display:'flex', gap:8, marginBottom:28, flexWrap:'wrap' }}>
        <UploadTab active={tab==='file'} onClick={() => setTab('file')} icon={FileText} label="File Upload"/>
        <UploadTab active={tab==='api'} onClick={() => setTab('api')} icon={Globe} label="API Endpoint"/>
        <UploadTab active={tab==='db'} onClick={() => setTab('db')} icon={Database} label="Database"/>
      </motion.div>

      {/* File Upload */}
      <AnimatePresence mode="wait">
        {tab === 'file' && (
          <motion.div key="file" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}>
            <div {...getRootProps()} className={`drop-zone ${isDragActive ? 'active' : ''}`} style={{ marginBottom:24 }}>
              <input {...getInputProps()}/>
              <AnimatePresence mode="wait">
                {uploading ? (
                  <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                    <Loader2 size={48} color="#00d4ff" style={{ animation:'spin 1s linear infinite' }}/>
                    <p style={{ color:'#00d4ff', fontWeight:600 }}>Processing your file...</p>
                    <div style={{ width:200 }}>
                      <div className="progress-bar"><div className="progress-fill" style={{ width:'70%', animation:'none' }}/></div>
                    </div>
                  </motion.div>
                ) : uploaded ? (
                  <motion.div key="done" initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                    <CheckCircle size={52} color="#00ff88"/>
                    <p style={{ color:'#00ff88', fontWeight:700, fontSize:18 }}>File uploaded successfully!</p>
                    <p style={{ color:'var(--text-muted)', fontSize:13 }}>{files[0]?.name} — {(files[0]?.size/1024).toFixed(1)} KB</p>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                    <div style={{ padding:20, borderRadius:20, background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.2)' }}>
                      <Upload size={40} color="#00d4ff"/>
                    </div>
                    <div>
                      <p style={{ fontSize:18, fontWeight:600, marginBottom:8, textAlign:'center' }}>
                        {isDragActive ? 'Drop it here!' : 'Drag & drop your file'}
                      </p>
                      <p style={{ color:'var(--text-muted)', textAlign:'center', fontSize:14 }}>CSV, JSON, or Excel — up to 500MB</p>
                    </div>
                    <button className="btn-ghost btn-sm" onClick={e => e.stopPropagation()}>Browse files</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {tab === 'api' && (
          <motion.div key="api" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}
            className="glass-card" style={{ padding:28, marginBottom:24 }}>
            <h3 style={{ fontWeight:600, marginBottom:20 }}>API Endpoint</h3>
            <div style={{ display:'flex', gap:12, marginBottom:16 }}>
              <select className="input-glass" style={{ width:100 }}>
                <option>GET</option><option>POST</option>
              </select>
              <input className="input-glass" placeholder="https://api.example.com/customers" value={apiUrl} onChange={e => setApiUrl(e.target.value)}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              <input className="input-glass" placeholder="Header key"/>
              <input className="input-glass" placeholder="Header value"/>
            </div>
            <button className="btn-primary" onClick={simulateUpload} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Globe size={16}/> Fetch Data
            </button>
          </motion.div>
        )}

        {tab === 'db' && (
          <motion.div key="db" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}
            className="glass-card" style={{ padding:28, marginBottom:24 }}>
            <h3 style={{ fontWeight:600, marginBottom:20 }}>Database Connection</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              {[['host','Host / IP'],['port','Port'],['user','Username'],['pass','Password'],['db','Database Name']].map(([k,pl]) => (
                <input key={k} className="input-glass" placeholder={pl} type={k==='pass' ? 'password' : 'text'}
                  value={dbForm[k]} onChange={e => setDbForm(p => ({...p,[k]:e.target.value}))}
                  style={{ gridColumn: k==='db' ? 'span 2' : undefined }}/>
              ))}
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn-ghost btn-sm">Test Connection</button>
              <button className="btn-primary btn-sm" style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Database size={14}/> Connect & Import
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dataset Preview */}
      {uploaded && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
          {/* Schema */}
          <div className="glass-card" style={{ padding:24, marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <Eye size={16} color="#00d4ff"/>
              <h3 style={{ fontWeight:600 }}>Schema Detection</h3>
              <span className="badge badge-green" style={{ marginLeft:'auto' }}>6 columns detected</span>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {schemaFields.map((f,i) => (
                <div key={i} style={{ padding:'8px 12px', borderRadius:8, background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.15)' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#00d4ff', marginBottom:2 }}>{f.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{f.type} {f.nullable ? '| nullable' : '| not null'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview table */}
          <div className="glass-card" style={{ padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <h3 style={{ fontWeight:600 }}>Data Preview</h3>
              <span style={{ color:'var(--text-muted)', fontSize:13 }}>— first 5 rows</span>
              <button className="btn-primary btn-sm" onClick={() => navigate('/app/cleaning')} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
                <ChevronRight size={14}/> Proceed to Cleaning
              </button>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>{Object.keys(previewRows[0]).filter(k => k!=='id').map(k => <th key={k}>{k}</th>)}</tr>
                </thead>
                <tbody>
                  {previewRows.map(row => (
                    <tr key={row.id}>
                      {Object.entries(row).filter(([k]) => k!=='id').map(([k,v]) => (
                        <td key={k}>{typeof v === 'number' && k.includes('risk')
                          ? <span style={{ color: v > 0.5 ? '#ff6b6b' : v > 0.3 ? '#ffc400' : '#00ff88', fontWeight:600 }}>{v}</span>
                          : String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
