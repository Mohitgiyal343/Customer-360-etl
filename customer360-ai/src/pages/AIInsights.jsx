import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Brain, TrendingUp, AlertTriangle, Zap, RefreshCw, ChevronRight, Sparkles, Target, Users, DollarSign } from 'lucide-react'

const insightCategories = [
  { id: 'all', label: 'All Insights' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'churn', label: 'Churn' },
  { id: 'growth', label: 'Growth' },
  { id: 'anomaly', label: 'Anomalies' },
]

const insights = [
  {
    id: 1, category: 'churn', priority: 'critical', icon: '⚠️',
    title: 'High-Value Churn Risk Detected',
    summary: '127 Enterprise customers show early churn signals — combined ARR at risk: $4.2M',
    detail: 'Days-since-login velocity dropped 40% over 2 weeks. Support ticket frequency surged 3x for this cohort. Recommend immediate CSM outreach with renewal offer.',
    actions: ['Launch Retention Campaign', 'Assign CSM', 'Export Segment'],
    color: '#ff6b6b',
    metric: { label: 'ARR at Risk', value: '$4.2M' },
    confidence: 91,
    time: '3 minutes ago',
  },
  {
    id: 2, category: 'revenue', priority: 'positive', icon: '💰',
    title: 'Upsell Opportunity: Enterprise Tier',
    summary: '83 SMB accounts are exhibiting Enterprise-level usage patterns — upgrade potential: $1.8M ARR',
    detail: 'These accounts have exceeded SMB plan limits for 3+ consecutive months, averaging 2.4x plan quota. Product-led growth signal indicates readiness for upgrade conversation.',
    actions: ['Notify Sales Team', 'Create Upsell Sequence', 'View Accounts'],
    color: '#00ff88',
    metric: { label: 'Upsell Potential', value: '$1.8M' },
    confidence: 87,
    time: '12 minutes ago',
  },
  {
    id: 3, category: 'growth', priority: 'info', icon: '🚀',
    title: 'East Region Outperforming Forecast',
    summary: 'East region revenue is tracking 22% above Q2 plan — consider accelerating headcount investment',
    detail: 'Three consecutive quarters of outperformance driven by strong enterprise pipeline and new partner ecosystem. Benchmark: East region CAC is 18% lower than West.',
    actions: ['View Regional Report', 'Allocate Budget', 'Forecast Q3'],
    color: '#00d4ff',
    metric: { label: 'Above Target', value: '+22%' },
    confidence: 94,
    time: '1 hour ago',
  },
  {
    id: 4, category: 'anomaly', priority: 'warning', icon: '🔍',
    title: 'Revenue Anomaly: March 15th Spike',
    summary: 'Unusual +340% revenue spike on March 15 — likely one-time deal, not repeatable',
    detail: 'Single enterprise deal ($2.1M) closed on March 15 distorts MoM trend. Excluding this deal, organic growth is 8.3% — aligning with historical baseline.',
    actions: ['Adjust Forecast', 'Tag as One-Time', 'View Details'],
    color: '#ffc400',
    metric: { label: 'Spike Magnitude', value: '+340%' },
    confidence: 98,
    time: '2 hours ago',
  },
  {
    id: 5, category: 'churn', priority: 'info', icon: '🎯',
    title: 'Consumer Segment Churn Trending Up',
    summary: 'Consumer churn increased 2.1pp to 5.4% — price sensitivity is primary driver',
    detail: 'NLP analysis of 1,200 cancellation surveys: 67% cite "too expensive", 22% cite "missing features", 11% cite "switching to competitor". Price elasticity suggests a 10% discount could recover 45% of churning accounts.',
    actions: ['Run Price Elasticity Model', 'Design Winback Flow', 'View Survey Data'],
    color: '#8b5cf6',
    metric: { label: 'Churn Rate', value: '5.4%' },
    confidence: 89,
    time: '4 hours ago',
  },
  {
    id: 6, category: 'growth', priority: 'positive', icon: '📈',
    title: 'Product-Led Growth Signal Strong',
    summary: 'Freemium → paid conversion rate hit 14.2% this quarter — highest in company history',
    detail: 'New onboarding flow (launched March 1) improved time-to-value by 38%. Users who complete the guided setup convert at 2.8x the rate of self-serve users.',
    actions: ['Scale Onboarding', 'A/B Test Further', 'Update Funnel Report'],
    color: '#00ff88',
    metric: { label: 'Conversion Rate', value: '14.2%' },
    confidence: 96,
    time: '6 hours ago',
  },
]

const forecastData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  actual: i < 5 ? Math.floor(4000 + i * 800 + Math.random() * 300) : null,
  forecast: Math.floor(4200 + i * 850),
  lower: Math.floor(3800 + i * 780),
  upper: Math.floor(4600 + i * 920),
}))

const churnRiskData = [
  { segment: 'Consumer', risk: 5.4, prev: 3.3 },
  { segment: 'Startup', risk: 4.1, prev: 4.0 },
  { segment: 'SMB', risk: 2.8, prev: 2.9 },
  { segment: 'Enterprise', risk: 1.2, prev: 1.4 },
]

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, padding: '10px 16px' }}>
      <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => p.value != null && (
        <p key={i} style={{ color: p.color || '#00d4ff', fontSize: 13, fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' ? (p.value > 100 ? `$${p.value.toLocaleString()}` : `${p.value}`) : p.value}</p>
      ))}
    </div>
  )
}

function InsightCard({ ins, expanded, onToggle }) {
  const priorityColors = { critical: '#ff6b6b', positive: '#00ff88', warning: '#ffc400', info: '#00d4ff' }
  const pc = priorityColors[ins.priority]

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card" style={{ padding: 20, cursor: 'pointer', borderLeft: `3px solid ${pc}` }}
      onClick={onToggle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{ins.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{ins.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ins.time}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: pc }}>{ins.metric.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ins.metric.label}</div>
          </div>
          <ChevronRight size={16} color="var(--text-muted)"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{ins.summary}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${ins.confidence}%`, background: `linear-gradient(90deg, ${pc}88, ${pc})`, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 11, color: pc, fontWeight: 600 }}>{ins.confidence}% confidence</span>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>{ins.detail}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ins.actions.map((a, i) => (
                  <button key={i} className={i === 0 ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                    onClick={e => { e.stopPropagation() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {i === 0 && <Zap size={11} />}{a}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AIInsights() {
  const [category, setCategory] = useState('all')
  const [expandedId, setExpandedId] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const filtered = insights.filter(i => category === 'all' || i.category === category)

  const refresh = () => {
    setRefreshing(true)
    setTimeout(() => { setRefreshing(false); setLastRefreshed(new Date()) }, 1800)
  }

  const summaryCards = [
    { label: 'Active Insights', value: insights.length, icon: Brain, color: '#8b5cf6' },
    { label: 'Critical Alerts', value: insights.filter(i => i.priority === 'critical').length, icon: AlertTriangle, color: '#ff6b6b' },
    { label: 'Opportunities', value: insights.filter(i => i.priority === 'positive').length, icon: TrendingUp, color: '#00ff88' },
    { label: 'Avg Confidence', value: `${Math.round(insights.reduce((s, i) => s + i.confidence, 0) / insights.length)}%`, icon: Target, color: '#00d4ff' },
  ]

  return (
    <div>
      <div className="bg-orb bg-orb-blue" style={{ width: 500, height: 500, top: -100, right: -100, opacity: 0.3 }} />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}><span className="gradient-text">AI Insights</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Auto-generated intelligence from your Customer360 data
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· Updated {lastRefreshed.toLocaleTimeString()}</span>
          </p>
        </div>
        <button className="btn-ghost" onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Analyzing…' : 'Refresh Analysis'}
        </button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {summaryCards.map((s, i) => (
          <div key={i} className="kpi-card" style={{ '--accent-color': s.color, padding: '16px 18px' }}>
            <div style={{ padding: 8, borderRadius: 8, background: `${s.color}18`, border: `1px solid ${s.color}30`, width: 'fit-content', marginBottom: 12 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Forecast + Churn Risk Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="chart-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontWeight: 600, marginBottom: 2 }}>AI Revenue Forecast</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Actual vs AI predicted ($K) · 90% confidence band</p>
            </div>
            <span className="badge badge-purple">ML Model</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="upper" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="upper" name="Upper Bound" stroke="none" fill="url(#upper)" fillOpacity={1} />
              <Area type="monotone" dataKey="lower" name="Lower Bound" stroke="none" fill="#050818" fillOpacity={1} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              <Area type="monotone" dataKey="actual" name="Actual" stroke="#00d4ff" strokeWidth={2.5} fill="url(#act)" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="chart-container">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 2 }}>Churn Risk by Segment</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current vs previous period</p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={churnRiskData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="segment" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<Tip />} formatter={v => `${v}%`} />
              <Bar dataKey="prev" name="Previous" fill="#475569" radius={[4, 4, 0, 0]} fillOpacity={0.5} />
              <Bar dataKey="risk" name="Current" fill="#ff6b6b" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Insight Cards */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="#8b5cf6" />
            <h2 style={{ fontWeight: 600, fontSize: 16 }}>Smart Recommendations</h2>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
            {insightCategories.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: category === cat.id ? 'rgba(0,212,255,0.2)' : 'transparent',
                  color: category === cat.id ? '#00d4ff' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(ins => (
            <InsightCard key={ins.id} ins={ins}
              expanded={expandedId === ins.id}
              onToggle={() => setExpandedId(expandedId === ins.id ? null : ins.id)} />
          ))}
        </div>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
