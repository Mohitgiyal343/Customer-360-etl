import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, Trash2, Copy, Wand2, FileSearch, Clock, TrendingUp } from 'lucide-react'

const beforeData = [
  { id:1, customer_id:'CUST-001', name:'Alice Johnson', email:'alice@acme.com', revenue:'12400', segment:'Enterprise', issue: null },
  { id:2, customer_id:'CUST-002', name:'', email:'bob@startup.io', revenue:'3200', segment:'Startup', issue:'missing_name' },
  { id:3, customer_id:'CUST-003', name:'Carol Smith', email:'carol@smb.co', revenue:null, segment:'SMB', issue:'missing_revenue' },
  { id:4, customer_id:'CUST-001', name:'Alice Johnson', email:'alice@acme.com', revenue:'12400', segment:'Enterprise', issue:'duplicate' },
  { id:5, customer_id:'CUST-005', name:'Eva Martinez', email:'eva@consumer', revenue:'890', segment:'Consumer', issue:'invalid_email' },
]

const afterData = [
  { id:1, customer_id:'CUST-001', name:'Alice Johnson', email:'alice@acme.com', revenue:'12400', segment:'Enterprise' },
  { id:2, customer_id:'CUST-002', name:'Unknown', email:'bob@startup.io', revenue:'3200', segment:'Startup' },
  { id:3, customer_id:'CUST-003', name:'Carol Smith', email:'carol@smb.co', revenue:'5100', segment:'SMB' },
  { id:5, customer_id:'CUST-005', name:'Eva Martinez', email:'eva@consumer.com', revenue:'890', segment:'Consumer' },
]

const issues = [
  { type:'missing_values', count:2, severity:'warning', icon:'🔴', label:'Missing Values', fix:'Fill with median / Unknown' },
  { type:'duplicates', count:1, severity:'error', icon:'🟠', label:'Duplicates', fix:'Keep first occurrence' },
  { type:'invalid_email', count:1, severity:'warning', icon:'🟡', label:'Invalid Emails', fix:'Fuzzy correction applied' },
  { type:'outliers', count:3, severity:'info', icon:'🔵', label:'Outliers', fix:'IQR capping at 99th pct' },
]

const timeline = [
  { time:'09:42:01', msg:'Loaded 5 rows, 6 columns', color:'#00d4ff' },
  { time:'09:42:02', msg:'Detected 2 missing values', color:'#ffc400' },
  { time:'09:42:02', msg:'Detected 1 duplicate row', color:'#ff6b6b' },
  { time:'09:42:03', msg:'Applied median imputation for revenue', color:'#8b5cf6' },
  { time:'09:42:03', msg:'Filled missing names with "Unknown"', color:'#8b5cf6' },
  { time:'09:42:04', msg:'Removed 1 duplicate record', color:'#ff6b6b' },
  { time:'09:42:04', msg:'Auto-corrected 1 email address', color:'#00ff88' },
  { time:'09:42:05', msg:'Cleaning complete — quality score: 94/100', color:'#00ff88' },
]

const aiRecs = [
  'Fill `revenue` nulls with segment median ($5,100)',
  'Remove exact duplicate CUST-001 — same email & revenue',
  'Correct email "eva@consumer" → "eva@consumer.com"',
  'Fill missing `name` with placeholder "Unknown"',
  'Flag 3 high-revenue outliers (>$15k) for review',
]

const IssueColor = { warning:'rgba(255,196,0,0.1)', error:'rgba(255,107,107,0.1)', info:'rgba(0,212,255,0.08)' }
const IssueBorder = { warning:'rgba(255,196,0,0.25)', error:'rgba(255,107,107,0.25)', info:'rgba(0,212,255,0.2)' }

export default function DataCleaning() {
  const [cleaned, setCleaned] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [view, setView] = useState('before')
  const [score, setScore] = useState(62)

  const runCleaning = () => {
    setCleaning(true)
    let s = 62
    const interval = setInterval(() => { s += 2; setScore(s); if (s >= 94) { clearInterval(interval); setCleaning(false); setCleaned(true) } }, 80)
  }

  const tableData = view === 'before' ? beforeData : afterData

  return (
    <div>
      <div className="bg-orb bg-orb-purple" style={{ width:400, height:400, top:-50, right:-50, opacity:0.3 }}/>

      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:700, marginBottom:6 }}><span className="gradient-text">Data Cleaning</span></h1>
        <p style={{ color:'var(--text-secondary)', fontSize:14 }}>AI-powered data quality analysis and remediation</p>
      </motion.div>

      {/* Quality Score + Issues */}
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, marginBottom:24 }}>
        {/* Score Gauge */}
        <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} className="glass-card" style={{ padding:28, textAlign:'center' }}>
          <h3 style={{ fontWeight:600, marginBottom:20, color:'var(--text-secondary)' }}>Quality Score</h3>
          <div style={{ position:'relative', width:160, height:160, margin:'0 auto 20px' }}>
            <svg viewBox="0 0 160 160" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="80" cy="80" r="65" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14"/>
              <motion.circle cx="80" cy="80" r="65" fill="none"
                stroke={score >= 80 ? '#00ff88' : score >= 60 ? '#ffc400' : '#ff6b6b'} strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${2*Math.PI*65}`}
                initial={{ strokeDashoffset: 2*Math.PI*65 }}
                animate={{ strokeDashoffset: 2*Math.PI*65 * (1 - score/100) }}
                transition={{ duration:0.5, ease:'easeOut' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:38, fontWeight:800, color: score>=80 ? '#00ff88' : score>=60 ? '#ffc400' : '#ff6b6b' }}>{score}</span>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>/ 100</span>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-around' }}>
            {[['Rows','5'],['Issues','7'],['Fixed','6']].map(([l,v]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:700 }}>{cleaned ? (l==='Issues' ? '1' : l==='Fixed' ? '6' : v) : v}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{l}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Issues */}
        <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="glass-card" style={{ padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontWeight:600 }}>Detected Issues</h3>
            {!cleaned && (
              <button className="btn-primary btn-sm" onClick={runCleaning} disabled={cleaning}
                style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Wand2 size={14}/> {cleaning ? 'Cleaning…' : 'Auto-Clean All'}
              </button>
            )}
            {cleaned && <span className="badge badge-green">All issues resolved ✓</span>}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {issues.map((iss,i) => (
              <div key={i} style={{ padding:'14px 16px', borderRadius:10,
                background: IssueColor[iss.severity], border:`1px solid ${IssueBorder[iss.severity]}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:16 }}>{iss.icon}</span>
                  <span style={{ fontWeight:600, fontSize:14 }}>{iss.label}</span>
                  <span style={{ marginLeft:'auto', fontWeight:700, fontSize:16 }}>{iss.count}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>{iss.fix}</p>
                {cleaned && <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:8, color:'#00ff88', fontSize:11 }}>
                  <CheckCircle size={11}/> Fixed
                </div>}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* AI Recommendations */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="glass-card-purple" style={{ padding:20, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <Wand2 size={16} color="#8b5cf6"/>
          <h3 style={{ fontWeight:600 }}>AI Recommendations</h3>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {aiRecs.map((r,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-secondary)' }}>
              <span style={{ color:'#8b5cf6', fontSize:16, fontWeight:700 }}>›</span> {r}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Before / After Table */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }} className="glass-card" style={{ padding:24, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <h3 style={{ fontWeight:600 }}>Data Preview</h3>
          <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:3, marginLeft:'auto' }}>
            {['before','after'].map(v => (
              <button key={v} onClick={() => setView(v)} disabled={v==='after' && !cleaned}
                style={{ padding:'5px 14px', borderRadius:6, border:'none', cursor: v==='after' && !cleaned ? 'not-allowed' : 'pointer',
                  background: view===v ? 'rgba(0,212,255,0.2)' : 'transparent',
                  color: v==='after' && !cleaned ? 'var(--text-muted)' : view===v ? '#00d4ff' : 'var(--text-secondary)',
                  fontSize:13, fontWeight:600, transition:'all 0.2s', opacity: v==='after' && !cleaned ? 0.5 : 1 }}>
                {v === 'before' ? 'Before' : 'After'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="data-table">
            <thead>
              <tr>{['customer_id','name','email','revenue','segment',view==='before'?'issue':'status'].map(k => <th key={k}>{k}</th>)}</tr>
            </thead>
            <tbody>
              {tableData.map(row => (
                <tr key={row.id}>
                  <td>{row.customer_id}</td>
                  <td>{row.name || <span style={{ color:'#ff6b6b', fontStyle:'italic' }}>missing</span>}</td>
                  <td>{row.email}</td>
                  <td>{row.revenue ?? <span style={{ color:'#ff6b6b', fontStyle:'italic' }}>null</span>}</td>
                  <td>{row.segment}</td>
                  <td>{view==='before'
                    ? row.issue ? <span className="badge badge-red">{row.issue}</span> : <span className="badge badge-green">OK</span>
                    : <span className="badge badge-green">Clean ✓</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Cleaning Log */}
      {cleaned && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="glass-card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <Clock size={16} color="#00d4ff"/>
            <h3 style={{ fontWeight:600 }}>Cleaning Log</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {timeline.map((t,i) => (
              <motion.div key={i} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.08 }}
                style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--text-muted)', minWidth:70 }}>{t.time}</span>
                <span style={{ width:8, height:8, borderRadius:'50%', background:t.color, marginTop:4, flexShrink:0 }}/>
                <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{t.msg}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
