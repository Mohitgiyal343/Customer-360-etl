import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { FileText, Download, Share2, Eye, Clock, BarChart2, TrendingUp, Users, X, Printer, ChevronRight } from 'lucide-react'

const reports = [
  { id:1, title:'Customer Churn Analysis', type:'ML Report', date:'2026-05-07', pages:12, icon:'⚠️', color:'#ff6b6b', views:284, status:'ready',
    summary: 'Churn rate across all segments for Q2 2026. Enterprise churn at 1.2%, Consumer at 5.4%. 127 high-risk accounts identified requiring immediate intervention.',
    charts: [
      { type:'bar', title:'Churn Rate by Segment', data:[{n:'Enterprise',v:1.2},{n:'SMB',v:2.8},{n:'Startup',v:4.1},{n:'Consumer',v:5.4}] },
      { type:'area', title:'Churn Trend (6M)', data:[{m:'Nov',v:2.1},{m:'Dec',v:2.0},{m:'Jan',v:2.2},{m:'Feb',v:2.3},{m:'Mar',v:2.5},{m:'Apr',v:2.4}] },
    ]
  },
  { id:2, title:'Q4 Revenue Summary', type:'Financial', date:'2026-05-05', pages:8, icon:'💰', color:'#00ff88', views:512, status:'ready',
    summary: 'Total Q4 revenue: $12.8M (+18.3% YoY). Enterprise segment drove 42% of revenue. Subscription ARR reached $48.6M.',
    charts: [
      { type:'area', title:'Monthly Revenue ($M)', data:[{m:'Oct',v:10.2},{m:'Nov',v:11.5},{m:'Dec',v:12.8}] },
      { type:'bar', title:'Revenue by Region', data:[{n:'East',v:5.2},{n:'North',v:4.1},{n:'West',v:4.5},{n:'South',v:3.0}] },
    ]
  },
  { id:3, title:'Segmentation Deep Dive', type:'Analytics', date:'2026-05-03', pages:15, icon:'🎯', color:'#8b5cf6', views:198, status:'ready',
    summary: 'K-Means clustering identified 4 distinct customer segments. Enterprise (38%), SMB (31%), Startup (22%), Consumer (9%). LTV spread: $180–$8,400.',
    charts: [
      { type:'pie', title:'Segment Distribution', data:[{name:'Enterprise',value:38,color:'#00d4ff'},{name:'SMB',value:31,color:'#8b5cf6'},{name:'Startup',value:22,color:'#00ff88'},{name:'Consumer',value:9,color:'#ffc400'}] },
      { type:'bar', title:'Avg LTV by Segment', data:[{n:'Enterprise',v:8400},{n:'SMB',v:3200},{n:'Startup',v:1800},{n:'Consumer',v:540}] },
    ]
  },
  { id:4, title:'ETL Pipeline Health', type:'Ops Report', date:'2026-05-01', pages:6, icon:'⚙️', color:'#00d4ff', views:87, status:'ready',
    summary: 'All 7 pipeline stages healthy. Avg execution time: 15.2s. 99.7% uptime in April. 312 duplicates removed, 89 nulls filled automatically.',
    charts: [
      { type:'area', title:'Pipeline Run Duration (s)', data:[{m:'Mon',v:14.2},{m:'Tue',v:15.1},{m:'Wed',v:13.8},{m:'Thu',v:16.2},{m:'Fri',v:15.2},{m:'Sat',v:14.7},{m:'Sun',v:15.5}] },
      { type:'bar', title:'Records Processed (K)', data:[{m:'Mon',v:48},{m:'Tue',v:52},{m:'Wed',v:47},{m:'Thu',v:51},{m:'Fri',v:49},{m:'Sat',v:44},{m:'Sun',v:46}] },
    ]
  },
  { id:5, title:'Monthly Executive Brief', type:'Executive', date:'2026-04-30', pages:4, icon:'📋', color:'#ffc400', views:641, status:'ready',
    summary: 'April highlights: Revenue +8.3%, MAU +5.7%, Churn -0.1pp. Key wins: East region, Enterprise upsells. Risk: Consumer churn uptick. Q2 forecast: $14.2M.',
    charts: [
      { type:'area', title:'Monthly Revenue Trend', data:[{m:'Jan',v:4.2},{m:'Feb',v:5.1},{m:'Mar',v:4.8},{m:'Apr',v:6.3},{m:'May',v:7.1}] },
      { type:'bar', title:'MAU Growth', data:[{m:'Jan',v:28},{m:'Feb',v:29},{m:'Mar',v:30},{m:'Apr',v:31},{m:'May',v:32}] },
    ]
  },
  { id:6, title:'Fraud Detection Summary', type:'Security', date:'2026-04-28', pages:10, icon:'🔐', color:'#ff6b6b', views:123, status:'generating' },
]

const activity = [
  { user:'Sarah K.', action:'Downloaded', report:'Q4 Revenue Summary', time:'2m ago', avatar:'SK' },
  { user:'James P.', action:'Shared', report:'Customer Churn Analysis', time:'18m ago', avatar:'JP' },
  { user:'Priya M.', action:'Viewed', report:'Segmentation Deep Dive', time:'1h ago', avatar:'PM' },
  { user:'Tom R.', action:'Generated', report:'ETL Pipeline Health', time:'3h ago', avatar:'TR' },
  { user:'Luna C.', action:'Downloaded', report:'Monthly Executive Brief', time:'5h ago', avatar:'LC' },
]

const stats = [
  { label:'Total Reports', value:24, icon:FileText, color:'#00d4ff' },
  { label:'Downloads This Month', value:1842, icon:Download, color:'#00ff88' },
  { label:'Shared Links', value:93, icon:Share2, color:'#8b5cf6' },
  { label:'Avg Pages / Report', value:9.2, icon:BarChart2, color:'#ffc400' },
]

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'rgba(10,15,30,0.95)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:10, padding:'10px 14px' }}>
      <p style={{ color:'#94a3b8', fontSize:11, marginBottom:5 }}>{label}</p>
      {payload.map((p,i) => <p key={i} style={{ color:p.color||'#00d4ff', fontSize:13, fontWeight:600 }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

function ReportPreviewModal({ report, onClose }) {
  if (!report) return null
  const printRef = useRef(null)

  const handlePrint = () => {
    const content = printRef.current
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    printWindow.document.write(`
      <html><head><title>${report.title}</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: white; color: #1e293b; padding: 40px; margin: 0; }
        h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #0f172a; }
        .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; margin-right: 8px; }
        .summary { background: #f8fafc; border-left: 4px solid #0ea5e9; padding: 16px 20px; border-radius: 8px; margin-bottom: 28px; line-height: 1.7; }
        .chart-placeholder { background: #f1f5f9; border-radius: 10px; height: 180px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; margin-bottom: 20px; font-weight: 600; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; display: flex; justify-content: space-between; }
        h2 { font-size: 18px; font-weight: 700; margin: 28px 0 14px; color: #1e293b; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>${report.icon} ${report.title}</h1>
      <div class="meta">
        <span class="badge">${report.type}</span>
        Generated on ${report.date} &nbsp;|&nbsp; ${report.pages} pages &nbsp;|&nbsp; ${report.views} views
      </div>
      <div class="summary">${report.summary}</div>
      ${(report.charts || []).map(c => `<h2>${c.title}</h2><div class="chart-placeholder">[${c.type.toUpperCase()} Chart — ${c.title}]</div>`).join('')}
      <div class="footer"><span>Customer360 AI Platform</span><span>Confidential — ${new Date().toLocaleDateString()}</span></div>
      </body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <motion.div initial={{ opacity:0, scale:0.9, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
          onClick={e => e.stopPropagation()}
          ref={printRef}
          style={{ background:'#0a0f1e', border:'1px solid rgba(0,212,255,0.2)', borderRadius:20, width:'min(820px, 100%)', maxHeight:'85vh', overflowY:'auto', padding:32, position:'relative' }}>

          {/* Modal Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ fontSize:28 }}>{report.icon}</span>
                <h2 style={{ fontSize:22, fontWeight:800 }}>{report.title}</h2>
              </div>
              <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--text-muted)' }}>
                <span style={{ padding:'2px 10px', borderRadius:20, background:`${report.color}18`, color:report.color, fontWeight:700 }}>{report.type}</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11}/>{report.date}</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><FileText size={11}/>{report.pages} pages</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Eye size={11}/>{report.views} views</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-primary btn-sm" onClick={handlePrint} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Printer size={13}/> Export PDF
              </button>
              <button onClick={onClose} style={{ padding:8, borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', cursor:'pointer' }}>
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>
          </div>

          {/* Summary */}
          <div style={{ padding:'14px 18px', borderRadius:10, background:'rgba(0,212,255,0.05)', borderLeft:`3px solid ${report.color}`, marginBottom:24 }}>
            <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7 }}>{report.summary}</p>
          </div>

          {/* Charts */}
          {report.charts && report.charts.map((chart, idx) => (
            <div key={idx} className="chart-container" style={{ marginBottom:16 }}>
              <h3 style={{ fontWeight:600, marginBottom:16 }}>{chart.title}</h3>
              <ResponsiveContainer width="100%" height={200}>
                {chart.type === 'area' ? (
                  <AreaChart data={chart.data}>
                    <defs>
                      <linearGradient id={`cg${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={report.color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={report.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="m" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tip/>}/>
                    <Area type="monotone" dataKey="v" name="Value" stroke={report.color} strokeWidth={2.5} fill={`url(#cg${idx})`}/>
                  </AreaChart>
                ) : chart.type === 'bar' ? (
                  <BarChart data={chart.data} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="n" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="v" name="Value" fill={report.color} radius={[4,4,0,0]} fillOpacity={0.85}/>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie data={chart.data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {chart.data.map((s,i) => <Cell key={i} fill={s.color}/>)}
                    </Pie>
                    <Tooltip formatter={v => `${v}%`}/>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          ))}

          <div style={{ marginTop:16, padding:'12px 16px', borderRadius:10, background:'rgba(255,255,255,0.03)', display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-muted)' }}>
            <span>Customer360 AI Platform</span>
            <span>Confidential — {new Date().toLocaleDateString()}</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function Reports() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [shareUrl, setShareUrl] = useState('')
  const [previewReport, setPreviewReport] = useState(null)

  const types = ['All', ...new Set(reports.map(r => r.type))]
  const filtered = reports.filter(r =>
    (filter === 'All' || r.type === filter) &&
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  const share = (r) => setShareUrl(`https://app.customer360.ai/reports/${r.id}?token=share_${Math.random().toString(36).slice(2,10)}`)

  const exportPDF = (r) => {
    if (r.status === 'generating') return
    setPreviewReport(r)
  }

  return (
    <div>
      {previewReport && <ReportPreviewModal report={previewReport} onClose={() => setPreviewReport(null)} />}
      <div className="bg-orb bg-orb-blue" style={{ width:400, height:400, top:-80, right:0, opacity:0.3 }}/>

      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:700, marginBottom:6 }}><span className="gradient-text">Reports</span></h1>
        <p style={{ color:'var(--text-secondary)', fontSize:14 }}>Generate, preview, export and share data reports</p>
      </motion.div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:16, marginBottom:28 }}>
        {stats.map((s,i) => (
          <motion.div key={i} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }}
            className="kpi-card" style={{ '--accent-color': s.color, padding:'18px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div style={{ padding:8, borderRadius:8, background:`${s.color}18`, border:`1px solid ${s.color}30` }}>
                <s.icon size={18} color={s.color}/>
              </div>
            </div>
            <div style={{ fontSize:28, fontWeight:800 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <input className="input-glass" placeholder="Search reports…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:280 }}/>
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:4 }}>
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                background: filter===t ? 'rgba(0,212,255,0.2)' : 'transparent',
                color: filter===t ? '#00d4ff' : 'var(--text-secondary)', transition:'all 0.2s' }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Report Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16, marginBottom:24 }}>
        {filtered.map((r,i) => (
          <motion.div key={r.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
            className="glass-card" style={{ padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ padding:10, borderRadius:10, background:`${r.color}15`, border:`1px solid ${r.color}25`, fontSize:20 }}>
                  {r.icon}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:2 }}>{r.title}</div>
                  <span className={`badge badge-${r.color==='#00ff88'?'green':r.color==='#8b5cf6'?'purple':r.color==='#ffc400'?'yellow':'blue'}`}>{r.type}</span>
                </div>
              </div>
              {r.status === 'generating'
                ? <span className="badge badge-yellow">Generating…</span>
                : <span className="badge badge-green">Ready</span>}
            </div>
            <div style={{ display:'flex', gap:16, marginBottom:16 }}>
              <span style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                <Clock size={11}/> {r.date}
              </span>
              <span style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                <FileText size={11}/> {r.pages} pages
              </span>
              <span style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                <Eye size={11}/> {r.views} views
              </span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-ghost btn-sm" disabled={r.status === 'generating'}
                onClick={() => r.status !== 'generating' && setPreviewReport(r)}
                style={{ display:'flex', alignItems:'center', gap:5, opacity: r.status === 'generating' ? 0.5 : 1, cursor: r.status === 'generating' ? 'not-allowed' : 'pointer' }}>
                <Eye size={12}/> Preview
              </button>
              <button className="btn-primary btn-sm" disabled={r.status === 'generating'}
                onClick={() => exportPDF(r)}
                style={{ display:'flex', alignItems:'center', gap:5, opacity: r.status === 'generating' ? 0.5 : 1, cursor: r.status === 'generating' ? 'not-allowed' : 'pointer' }}>
                <Download size={12}/> Export PDF
              </button>
              <button onClick={() => share(r)} className="btn-ghost btn-sm" style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Share2 size={12}/> Share
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Share URL */}
      {shareUrl && (
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="glass-card-green" style={{ padding:16, borderRadius:12, marginBottom:24, display:'flex', gap:12, alignItems:'center' }}>
          <Share2 size={16} color="#00ff88"/>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>Share link generated:</p>
            <p style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'#00ff88', wordBreak:'break-all' }}>{shareUrl}</p>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(shareUrl) }}>Copy</button>
          <button className="btn-ghost btn-sm" onClick={() => setShareUrl('')}><X size={12}/></button>
        </motion.div>
      )}

      {/* Activity Log */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} className="glass-card" style={{ padding:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <Clock size={16} color="#00d4ff"/>
          <h3 style={{ fontWeight:600 }}>Recent Activity</h3>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {activity.map((a,i) => (
            <motion.div key={i} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.5+i*0.07 }}
              style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg, #00d4ff, #8b5cf6)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>
                {a.avatar}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13 }}>
                  <span style={{ fontWeight:600 }}>{a.user}</span>
                  <span style={{ color:'var(--text-secondary)' }}> {a.action} </span>
                  <span style={{ color:'#00d4ff' }}>{a.report}</span>
                </p>
              </div>
              <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>{a.time}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
