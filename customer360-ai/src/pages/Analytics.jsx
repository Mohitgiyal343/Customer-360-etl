import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis
} from 'recharts'
import { TrendingUp, Activity, Map, Grid } from 'lucide-react'

const timeData = Array.from({ length:24 }, (_, i) => ({
  hour: `${String(i).padStart(2,'0')}:00`,
  sessions: Math.floor(800 + Math.random()*1200 + (i>8&&i<18?1500:0)),
  conversions: Math.floor(50 + Math.random()*150 + (i>9&&i<17?200:0)),
  revenue: Math.floor(2000 + Math.random()*4000 + (i>10&&i<16?6000:0)),
}))

const scatterData = Array.from({ length:60 }, () => ({
  ltv: Math.floor(200 + Math.random()*5000),
  sessions: Math.floor(2 + Math.random()*80),
  churnRisk: +(Math.random()).toFixed(2),
  size: Math.floor(5 + Math.random()*20),
}))

const heatmapCols = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const heatmapRows = ['00–04','04–08','08–12','12–16','16–20','20–24']
const heatmap = heatmapRows.map(r => ({
  label: r,
  values: heatmapCols.map(c => ({ col:c, val: Math.floor(Math.random()*100) }))
}))

const geoData = [
  { country:'United States', revenue:4.8, pct:37, color:'#00d4ff' },
  { country:'United Kingdom', revenue:1.9, pct:15, color:'#8b5cf6' },
  { country:'Germany', revenue:1.4, pct:11, color:'#00ff88' },
  { country:'India', revenue:1.1, pct:9, color:'#ffc400' },
  { country:'Canada', revenue:0.9, pct:7, color:'#ff6b6b' },
  { country:'Australia', revenue:0.7, pct:5, color:'#00d4ff' },
  { country:'Others', revenue:2.0, pct:16, color:'#475569' },
]

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'rgba(10,15,30,0.95)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:10, padding:'10px 16px' }}>
      <p style={{ color:'#94a3b8', fontSize:11, marginBottom:6 }}>{label}</p>
      {payload.map((p,i) => <p key={i} style={{ color:p.color||p.fill||'#00d4ff', fontSize:13, fontWeight:600 }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

const heatColor = (v) => {
  if (v > 80) return '#00d4ff'
  if (v > 60) return '#8b5cf6'
  if (v > 40) return '#ffc400'
  if (v > 20) return '#ff6b6b80'
  return 'rgba(255,255,255,0.05)'
}

export default function Analytics() {
  const [metric, setMetric] = useState('sessions')

  return (
    <div>
      <div className="bg-orb bg-orb-blue" style={{ width:500, height:500, top:-100, right:-100, opacity:0.3 }}/>

      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:700, marginBottom:6 }}><span className="gradient-text">Advanced Analytics</span></h1>
        <p style={{ color:'var(--text-secondary)', fontSize:14 }}>Time-series, scatter, heatmap and geo breakdowns</p>
      </motion.div>

      {/* Time Series */}
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="chart-container" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Activity size={16} color="#00d4ff"/>
            <h3 style={{ fontWeight:600 }}>24-Hour Activity</h3>
          </div>
          <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:3 }}>
            {['sessions','conversions','revenue'].map(m => (
              <button key={m} onClick={() => setMetric(m)} style={{ padding:'5px 12px', borderRadius:6, border:'none', cursor:'pointer',
                background: metric===m ? 'rgba(0,212,255,0.2)' : 'transparent',
                color: metric===m ? '#00d4ff' : 'var(--text-secondary)',
                fontSize:12, fontWeight:600, transition:'all 0.2s', textTransform:'capitalize' }}>{m}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={timeData}>
            <defs>
              <linearGradient id="metric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
            <XAxis dataKey="hour" tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} interval={2}/>
            <YAxis tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>}/>
            <Area type="monotone" dataKey={metric} name={metric} stroke="#00d4ff" strokeWidth={2.5} fill="url(#metric)"/>
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Scatter + Heatmap */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Scatter */}
        <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }} className="chart-container">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <TrendingUp size={16} color="#8b5cf6"/>
            <h3 style={{ fontWeight:600 }}>LTV vs Sessions</h3>
            <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:4 }}>(color = churn risk)</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="sessions" name="Sessions" tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} label={{ value:'Sessions', position:'insideBottom', offset:-5, fill:'#475569', fontSize:11 }}/>
              <YAxis dataKey="ltv" name="LTV ($)" tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false}/>
              <ZAxis dataKey="size" range={[40,200]}/>
              <Tooltip cursor={{ strokeDasharray:'3 3', stroke:'rgba(0,212,255,0.3)' }}
                content={({ active,payload }) => active&&payload?.length ? (
                  <div style={{ background:'rgba(10,15,30,0.95)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:10, padding:'10px 14px' }}>
                    <p style={{ color:'#00d4ff', fontWeight:600 }}>LTV: ${payload[0]?.payload?.ltv}</p>
                    <p style={{ color:'#8b5cf6', fontWeight:600 }}>Sessions: {payload[0]?.payload?.sessions}</p>
                    <p style={{ color:'#ffc400', fontWeight:600 }}>Churn Risk: {payload[0]?.payload?.churnRisk}</p>
                  </div>
                ) : null}/>
              <Scatter data={scatterData} fill="#00d4ff" fillOpacity={0.7}/>
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Heatmap */}
        <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }} className="chart-container">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <Grid size={16} color="#ffc400"/>
            <h3 style={{ fontWeight:600 }}>Traffic Heatmap</h3>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>(by day & hour)</span>
          </div>
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'60px repeat(7,1fr)', gap:3, marginBottom:4 }}>
              <div/>
              {heatmapCols.map(c => <div key={c} style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', fontWeight:600 }}>{c}</div>)}
            </div>
            {heatmap.map((row,i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'60px repeat(7,1fr)', gap:3, marginBottom:3 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', alignSelf:'center' }}>{row.label}</div>
                {row.values.map((cell,j) => (
                  <motion.div key={j} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:(i*7+j)*0.01 }}
                    style={{ height:32, borderRadius:5, background:heatColor(cell.val),
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600,
                      color: cell.val>40 ? 'rgba(5,8,24,0.8)' : 'rgba(255,255,255,0.3)',
                      cursor:'default' }} title={`${cell.val}%`}>
                    {cell.val}
                  </motion.div>
                ))}
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8 }}>
              {[['Low','rgba(255,255,255,0.05)'],['Med','#ffc400'],['High','#8b5cf6'],['Peak','#00d4ff']].map(([l,c]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:c }}/>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Geo Breakdown */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} className="glass-card" style={{ padding:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <Map size={16} color="#00ff88"/>
          <h3 style={{ fontWeight:600 }}>Revenue by Geography</h3>
        </div>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
          <div style={{ flex:1 }}>
            {geoData.map((g,i) => (
              <motion.div key={i} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.5+i*0.08 }}
                style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:120, fontSize:13, color:'var(--text-secondary)', flexShrink:0 }}>{g.country}</div>
                <div style={{ flex:1 }}>
                  <div className="progress-bar">
                    <motion.div className="progress-fill" initial={{ width:0 }} animate={{ width:`${g.pct}%` }}
                      transition={{ delay:0.6+i*0.08, duration:0.7, ease:[0.4,0,0.2,1] }}
                      style={{ background:`linear-gradient(90deg, ${g.color}88, ${g.color})` }}/>
                  </div>
                </div>
                <div style={{ width:60, textAlign:'right', fontSize:13, fontWeight:600, color:g.color }}>${g.revenue}M</div>
                <div style={{ width:40, textAlign:'right', fontSize:12, color:'var(--text-muted)' }}>{g.pct}%</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
