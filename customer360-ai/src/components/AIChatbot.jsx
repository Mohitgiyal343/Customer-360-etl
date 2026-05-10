import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Sparkles, BarChart3, TrendingUp, Search, AlertTriangle, Copy, CheckCircle, RefreshCw } from 'lucide-react'

const quickPrompts = [
  { icon: TrendingUp,    text: 'Why did revenue drop?' },
  { icon: BarChart3,     text: 'Show top 10 customers' },
  { icon: Search,        text: 'Predict next month sales' },
  { icon: AlertTriangle, text: 'Find anomalies in data' },
]

const RESPONSES = {
  revenue: "📊 **Revenue Analysis**\n\nBased on your Customer360 data:\n\n• **Total revenue**: $12.8M in December (+18.3% MoM)\n• **Best quarter**: Q4 with $34.5M total\n• **Top segment**: Enterprise at 42% of revenue\n• **Trend**: Accelerating — 3 consecutive months above target\n\nWould you like me to drill into a specific time period or segment?",
  drop: "📉 **Revenue Drop Investigation**\n\nI found 2 dips in your data:\n\n• **March**: Revenue missed target by 4% ($4.8M vs $5.0M target) — aligned with market-wide slowdown\n• **June**: Minor dip ($6.8M vs $7.1M in May) — seasonal pattern, recovers in July\n\nNeither represents structural risk. The overall 12-month trend is strongly upward (+78% Jan→Dec).",
  churn: "⚠️ **Churn Risk Alert**\n\n127 customers show early churn signals:\n\n• **Enterprise**: 1.2% churn rate (healthy)\n• **SMB**: 2.8% (within target)\n• **Consumer**: **5.4% ↑** (action needed)\n\n**Recovery opportunity**: $2.4M in at-risk ARR\n\n```sql\nSELECT customer_id, days_since_login, churn_probability\nFROM customer_360\nWHERE churn_probability > 0.7\nORDER BY arr DESC LIMIT 20;\n```\n\nShall I trigger a retention campaign for the high-risk cohort?",
  forecast: "🤖 **AI Sales Forecast**\n\nNext month revenue prediction: **$14.2M** (±8.2% CI)\n\nKey drivers:\n1. Seasonal uplift: +15%\n2. New product launch: +8%\n3. Enterprise pipeline: +12%\n4. Consumer churn headwind: -3%\n\n**Model accuracy**: 94.2% | **Last trained**: 2 hours ago\n\n*Forecast updated every 6 hours using latest transaction data.*",
  top: "👑 **Top 10 Customers by ARR**\n\n| # | Customer | ARR | Segment | Churn Risk |\n|---|----------|-----|---------|------------|\n| 1 | Acme Corp | $840K | Enterprise | 🟢 Low |\n| 2 | GlobalTech | $720K | Enterprise | 🟢 Low |\n| 3 | MegaCo | $610K | Enterprise | 🟡 Med |\n| 4 | StartupXYZ | $480K | Startup | 🟠 High |\n| 5 | FinancePro | $440K | Enterprise | 🟢 Low |\n\n*Combined ARR of top 10: $5.2M (41% of total)*",
  anomaly: "🔍 **Anomaly Detection Complete**\n\nI found 3 anomalies in your data:\n\n• **March 15**: Revenue spike +340% — single large enterprise deal ($2.1M), one-time event\n• **CUST-4821**: 0 logins in 45 days despite active subscription — churn signal\n• **API endpoint**: Response time degraded 4x on Tuesdays — infrastructure pattern\n\nWould you like me to investigate any of these further?",
  segment: "🎯 **Customer Segmentation Summary**\n\nYour 48,291 active customers fall into 4 segments:\n\n• **Enterprise** (38%): Avg LTV $8,400 | Churn 1.2%\n• **SMB** (31%): Avg LTV $3,200 | Churn 2.8%\n• **Startup** (22%): Avg LTV $1,800 | Churn 4.1%\n• **Consumer** (9%): Avg LTV $540 | Churn 5.4%\n\n💡 **Insight**: Enterprise segment generates 4.2x the LTV of Consumer — consider shifting acquisition focus upmarket.",
  default: [
    "📊 **Analysis Complete**\n\nI've analyzed your Customer360 dataset and found:\n\n• **Revenue trend**: Up 18.3% MoM in December — highest since Q2\n• **Top segment**: Enterprise customers (42% of revenue)\n• **Anomaly**: Unusual spike on March 15th — likely promotional impact\n\nWould you like me to generate a dashboard or export this analysis?",
    "🔍 **Insight Generated**\n\nFrom your Customer360 data:\n\n• **Churn risk**: 127 customers show early warning signals\n• **Recovery opportunity**: $2.4M in recoverable ARR\n• **Recommended action**: Trigger retention campaign for at-risk cohort\n\nShall I train a churn prediction model on this data?",
    "💡 **Pattern Detected**\n\nYour data reveals an interesting correlation:\n\n• Customers with **>20 sessions/month** churn 3.2x less than low-engagement customers\n• **Product feature adoption** is the strongest predictor of long-term retention\n• Users who complete onboarding convert at **2.8x** the baseline rate\n\nWant me to identify which customers are at risk based on these signals?",
  ]
}

function getResponse(text) {
  const t = text.toLowerCase()
  if (t.includes('drop') || t.includes('down') || t.includes('decline')) return RESPONSES.drop
  if (t.includes('churn') || t.includes('risk') || t.includes('attrition')) return RESPONSES.churn
  if (t.includes('forecast') || t.includes('predict') || t.includes('next month') || t.includes('future')) return RESPONSES.forecast
  if (t.includes('top') || t.includes('customer')) return RESPONSES.top
  if (t.includes('anomal') || t.includes('unusual') || t.includes('outlier')) return RESPONSES.anomaly
  if (t.includes('segment') || t.includes('tier') || t.includes('group')) return RESPONSES.segment
  if (t.includes('revenue') || t.includes('sales') || t.includes('growth')) return RESPONSES.revenue
  return RESPONSES.default[Math.floor(Math.random() * RESPONSES.default.length)]
}

function renderContent(text) {
  const lines = text.split('\n')
  let inCode = false
  const codeLines = []
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (inCode) {
        result.push(
          <pre key={`code-${i}`} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 8, padding: '10px 12px', fontSize: 11, overflowX: 'auto', fontFamily: 'JetBrains Mono, monospace', color: '#00d4ff', margin: '6px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {codeLines.join('\n')}
          </pre>
        )
        codeLines.length = 0
        inCode = false
      } else {
        inCode = true
      }
      continue
    }
    if (inCode) { codeLines.push(line); continue }

    if (!line.trim()) { result.push(<br key={i} />); continue }

    // Table row
    if (line.startsWith('|')) {
      if (line.includes('---')) continue
      const cells = line.split('|').filter(c => c.trim())
      const isHeader = i < lines.length - 1 && lines[i + 1]?.includes('---')
      result.push(
        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: isHeader ? 700 : 400, color: isHeader ? '#00d4ff' : 'var(--text-secondary)' }}>
          {cells.map((c, j) => <span key={j} style={{ flex: 1, minWidth: 0 }}>{c.trim()}</span>)}
        </div>
      )
      continue
    }

    // Bullet
    if (line.startsWith('• ') || line.startsWith('* ')) {
      const content = line.slice(2)
      result.push(
        <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 8 }}>
          <span style={{ color: '#00d4ff', marginRight: 4 }}>•</span>
          {parseBold(content)}
        </p>
      )
      continue
    }

    // Numbered list
    if (/^\d+\./.test(line)) {
      result.push(<p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{parseBold(line)}</p>)
      continue
    }

    // Bold-only heading (starts with **)
    if (line.startsWith('**') && line.endsWith('**')) {
      result.push(<p key={i} style={{ fontSize: 14, fontWeight: 700, color: 'white', marginTop: 4 }}>{line.slice(2, -2)}</p>)
      continue
    }

    // Italic
    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      result.push(<p key={i} style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>{line.slice(1, -1)}</p>)
      continue
    }

    result.push(<p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{parseBold(line)}</p>)
  }
  return result
}

function parseBold(text) {
  if (!text.includes('**')) return text
  const parts = text.split(/\*\*(.*?)\*\*/)
  return parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: 'white', fontWeight: 700 }}>{p}</strong> : p)
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "👋 Hi! I'm your **Customer360 AI Analyst**.\n\nAsk me anything about your data — I can analyze trends, generate SQL, detect anomalies, and create forecasts.",
    time: new Date()
  }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const sendMessage = async (text) => {
    if (!text.trim() || thinking) return
    setMessages(prev => [...prev, { role: 'user', content: text, time: new Date() }])
    setInput('')
    setThinking(true)
    await new Promise(r => setTimeout(r, 900 + Math.random() * 700))
    setThinking(false)
    setMessages(prev => [...prev, { role: 'assistant', content: getResponse(text), time: new Date() }])
  }

  const copyMsg = (idx, text) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: "👋 Hi! I'm your **Customer360 AI Analyst**.\n\nAsk me anything about your data — I can analyze trends, generate SQL, detect anomalies, and create forecasts.", time: new Date() }])
  }

  const bubble = {
    position: 'fixed', bottom: 24, right: 24, zIndex: 999,
    width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,212,255,0.35)',
  }

  const panel = {
    position: 'fixed', bottom: 88, right: 24, zIndex: 998,
    width: 380, height: 520,
    background: 'rgba(5, 8, 24, 0.97)', backdropFilter: 'blur(24px)',
    border: '1px solid rgba(0, 212, 255, 0.25)', borderRadius: 20,
    boxShadow: '0 20px 80px rgba(0,0,0,0.8), 0 0 40px rgba(0,212,255,0.1)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }

  return (
    <>
      {/* Floating Bubble */}
      <motion.button style={bubble} onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}><X size={22} color="white" /></motion.div>
            : <motion.div key="bot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Bot size={22} color="white" /></motion.div>
          }
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div style={panel}
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', flexShrink: 0 }}>
                <Sparkles size={16} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>AI Data Analyst</div>
                <div style={{ fontSize: 10, color: '#00ff88', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
                  Online · GPT-4 powered
                </div>
              </div>
              <button onClick={clearChat} title="Clear chat"
                style={{ padding: 6, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                <RefreshCw size={12} color="#64748b" />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '90%' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 24, height: 24, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', flexShrink: 0, marginTop: 2 }}>
                        <Sparkles size={11} color="white" />
                      </div>
                    )}
                    <div style={{
                      padding: '10px 14px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))'
                        : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(0,212,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {renderContent(msg.content)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingLeft: msg.role === 'assistant' ? 32 : 0 }}>
                    <span style={{ fontSize: 10, color: '#334155' }}>
                      {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.role === 'assistant' && (
                      <button onClick={() => copyMsg(i, msg.content)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        {copiedIdx === i ? <CheckCircle size={11} color="#00ff88" /> : <Copy size={11} color="#334155" />}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {thinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', flexShrink: 0 }}>
                    <Sparkles size={11} color="white" />
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '12px 16px', borderRadius: '4px 18px 18px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4ff', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Prompts */}
            <div style={{ padding: '6px 10px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
              {quickPrompts.map(qp => (
                <button key={qp.text} onClick={() => sendMessage(qp.text)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20,
                    whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s',
                    background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff'
                  }}>
                  <qp.icon size={10} />{qp.text}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input-glass" placeholder="Ask about your data…" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  style={{ flex: 1, fontSize: 13, padding: '8px 12px' }} />
                <button onClick={() => sendMessage(input)}
                  disabled={!input.trim() || thinking}
                  className="btn-primary" style={{ padding: '8px 14px', flexShrink: 0, opacity: (!input.trim() || thinking) ? 0.4 : 1, cursor: (!input.trim() || thinking) ? 'not-allowed' : 'pointer' }}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </>
  )
}
