import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  TrendingUp, Users, AlertTriangle, DollarSign,
  Activity, BarChart2, RefreshCw, Sparkles,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'

// Full 12-month dataset
const ALL_REVENUE = [
  { month: 'Jan', revenue: 4.2, target: 4.0 }, { month: 'Feb', revenue: 5.1, target: 4.5 },
  { month: 'Mar', revenue: 4.8, target: 5.0 }, { month: 'Apr', revenue: 6.3, target: 5.5 },
  { month: 'May', revenue: 7.1, target: 6.0 }, { month: 'Jun', revenue: 6.8, target: 6.5 },
  { month: 'Jul', revenue: 8.2, target: 7.0 }, { month: 'Aug', revenue: 9.0, target: 7.5 },
  { month: 'Sep', revenue: 8.7, target: 8.0 }, { month: 'Oct', revenue: 10.2, target: 8.5 },
  { month: 'Nov', revenue: 11.5, target: 9.0 }, { month: 'Dec', revenue: 12.8, target: 9.5 },
]

const FILTER_SLICES = { '1M': 1, '3M': 3, '6M': 6, '12M': 12 }

const segmentData = [
  { name: 'Enterprise', value: 38, color: '#00d4ff' },
  { name: 'SMB', value: 31, color: '#8b5cf6' },
  { name: 'Startup', value: 22, color: '#00ff88' },
  { name: 'Consumer', value: 9, color: '#ffc400' },
]

const salesData = [
  { region: 'North', q1: 2.1, q2: 2.8, q3: 3.2, q4: 4.1 },
  { region: 'South', q1: 1.8, q2: 2.2, q3: 2.6, q4: 3.0 },
  { region: 'East', q1: 3.0, q2: 3.5, q3: 4.1, q4: 5.2 },
  { region: 'West', q1: 2.5, q2: 3.0, q3: 3.8, q4: 4.5 },
]

const funnelData = [
  { name: 'Visitors', value: 24500, fill: '#00d4ff' },
  { name: 'Leads', value: 9800, fill: '#8b5cf6' },
  { name: 'Prospects', value: 4200, fill: '#00ff88' },
  { name: 'Customers', value: 1560, fill: '#ffc400' },
]

// KPI definitions — values depend on filter period
const getKpis = (filter) => {
  const multipliers = { '1M': 1, '3M': 0.3, '6M': 0.6, '12M': 1 }
  const m = multipliers[filter]
  return [
    { label: 'Total Revenue', value: `$${(12.8 * m).toFixed(1)}M`, change: '+18.3%', up: true, icon: DollarSign, color: '#00d4ff' },
    { label: 'Active Customers', value: Math.round(48291 * (0.7 + m * 0.3)).toLocaleString(), change: '+5.7%', up: true, icon: Users, color: '#00ff88' },
    { label: 'Churn Rate', value: `${(2.1 + m * 0.3).toFixed(1)}%`, change: '+0.3%', up: false, icon: AlertTriangle, color: '#ff6b6b' },
    { label: 'Avg LTV', value: `$${Math.round(2840 * (0.8 + m * 0.2)).toLocaleString()}`, change: '+12.1%', up: true, icon: TrendingUp, color: '#8b5cf6' },
    { label: 'Monthly Active', value: Math.round(31842 * (0.85 + m * 0.15)).toLocaleString(), change: '+8.9%', up: true, icon: Activity, color: '#ffc400' },
    { label: 'MoM Growth', value: `${(12.1 + m * 6.2).toFixed(1)}%`, change: '+4.2pp', up: true, icon: BarChart2, color: '#00d4ff' },
  ]
}

const aiInsights = [
  { icon: '📈', text: 'Revenue grew 18.3% MoM in December — highest since Q2 last year.', type: 'positive' },
  { icon: '⚠️', text: 'Churn rate spiked 2.1% in Consumer segment — action recommended.', type: 'warning' },
  { icon: '🎯', text: 'East region is top performer — consider expanding headcount.', type: 'info' },
  { icon: '💡', text: 'Enterprise LTV is 4.2x higher — upsell pipeline has $3.2M potential.', type: 'positive' },
  { icon: '🔮', text: 'ML forecast: Q1 revenue projected at $14.2M (+10.9%).', type: 'info' },
]

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, padding: '10px 16px' }}>
      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

export default function Dashboard() {
  const [filter, setFilter] = useState('12M')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const revenueData = ALL_REVENUE.slice(-FILTER_SLICES[filter])
  const kpis = getKpis(filter)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
      setRefreshKey(k => k + 1)
      setLastUpdated(new Date())
    }, 1200)
  }

  const itemV = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

  return (
    <div style={{ position: 'relative' }}>
      <div className="bg-orb bg-orb-blue" style={{ width: 500, height: 500, top: -100, right: -100, opacity: 0.4 }} />
      <div className="bg-orb bg-orb-purple" style={{ width: 400, height: 400, bottom: 100, left: -50, opacity: 0.3 }} />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}><span className="gradient-text">Analytics Dashboard</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Real-time overview of your business performance
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {lastUpdated.toLocaleTimeString()}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, border: '1px solid rgba(0,212,255,0.1)' }}>
            {['1M', '3M', '6M', '12M'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: filter === f ? 'rgba(0,212,255,0.2)' : 'transparent',
                color: filter === f ? '#00d4ff' : 'var(--text-secondary)'
              }}>{f}</button>
            ))}
          </div>
          <button className="btn-primary btn-sm" onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div key={`kpi-${filter}-${refreshKey}`} initial="hidden" animate="visible" transition={{ staggerChildren: 0.07 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <motion.div key={i} variants={itemV} className="kpi-card" style={{ '--accent-color': kpi.color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ padding: 10, borderRadius: 10, background: `${kpi.color}18`, border: `1px solid ${kpi.color}30` }}>
                <kpi.icon size={20} color={kpi.color} />
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600,
                color: kpi.up ? '#00ff88' : '#ff6b6b',
                background: kpi.up ? 'rgba(0,255,136,0.1)' : 'rgba(255,107,107,0.1)',
                padding: '3px 8px', borderRadius: 20
              }}>
                {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {kpi.change}
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{kpi.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <motion.div key={`rev-${filter}`} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="chart-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontWeight: 600, marginBottom: 2 }}>Revenue Trend</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Actual vs Target ($M) · {filter}</p>
            </div>
            <span className="badge badge-blue">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#00d4ff" strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="chart-container">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 2 }}>Customer Segmentation</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Distribution by tier</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width="50%" height={190}>
              <PieChart>
                <Pie data={segmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {segmentData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={v => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {segmentData.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.name}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: s.color }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="chart-container">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 2 }}>Regional Sales</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quarterly breakdown ($M)</p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={salesData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="region" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              {[['q1', '#00d4ff'], ['q2', '#8b5cf6'], ['q3', '#00ff88'], ['q4', '#ffc400']].map(([k, c]) => (
                <Bar key={k} dataKey={k} name={k.toUpperCase()} fill={c} radius={[4, 4, 0, 0]} fillOpacity={0.85} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="chart-container">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 2 }}>Sales Funnel</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Conversion pipeline</p>
          </div>
          {funnelData.map((f, i) => {
            const pct = Math.round((f.value / funnelData[0].value) * 100)
            return (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: f.fill }}>{f.value.toLocaleString()}</span>
                </div>
                <div className="progress-bar">
                  <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.8 + i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    style={{ background: `linear-gradient(90deg, ${f.fill}aa, ${f.fill})` }} />
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>

      {/* AI Insights */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ padding: 8, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <Sparkles size={18} color="#8b5cf6" />
          </div>
          <div>
            <h3 style={{ fontWeight: 600 }}>AI Insights</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Auto-generated from your data</p>
          </div>
          <span className="badge badge-purple" style={{ marginLeft: 'auto' }}>GPT-4o</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {aiInsights.map((ins, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.08 }}
              style={{
                display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10,
                background: ins.type === 'warning' ? 'rgba(255,196,0,0.06)' : ins.type === 'positive' ? 'rgba(0,255,136,0.05)' : 'rgba(0,212,255,0.05)',
                border: `1px solid ${ins.type === 'warning' ? 'rgba(255,196,0,0.2)' : ins.type === 'positive' ? 'rgba(0,255,136,0.15)' : 'rgba(0,212,255,0.12)'}`
              }}>
              <span style={{ fontSize: 18 }}>{ins.icon}</span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ins.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
