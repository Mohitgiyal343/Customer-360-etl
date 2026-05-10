import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Play, Plus, Trash2, CheckCircle, XCircle, Loader2, Copy, Clock, ChevronDown, ChevronRight, Key, Link, RefreshCw } from 'lucide-react'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const METHOD_COLORS = { GET: '#00d4ff', POST: '#00ff88', PUT: '#ffc400', PATCH: '#8b5cf6', DELETE: '#ff6b6b' }

const savedConnections = [
  { id: 1, name: 'Customer API', url: 'https://api.customer360.ai/v1/customers', method: 'GET', status: 'active' },
  { id: 2, name: 'Salesforce CRM', url: 'https://myorg.salesforce.com/services/data/v57.0/query', method: 'GET', status: 'active' },
  { id: 3, name: 'Stripe Billing', url: 'https://api.stripe.com/v1/customers', method: 'GET', status: 'active' },
  { id: 4, name: 'HubSpot Contacts', url: 'https://api.hubapi.com/crm/v3/objects/contacts', method: 'POST', status: 'inactive' },
]

const presetExamples = [
  { label: 'JSONPlaceholder Users', url: 'https://jsonplaceholder.typicode.com/users', method: 'GET' },
  { label: 'Random User API', url: 'https://randomuser.me/api/?results=5', method: 'GET' },
  { label: 'REST Countries', url: 'https://restcountries.com/v3.1/name/united', method: 'GET' },
]

function HeaderRow({ header, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      <input className="input-glass" placeholder="Key" value={header.key}
        onChange={e => onChange({ ...header, key: e.target.value })} style={{ flex: 1 }} />
      <input className="input-glass" placeholder="Value" value={header.value}
        onChange={e => onChange({ ...header, value: e.target.value })} style={{ flex: 1 }} />
      <button onClick={onRemove} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'rgba(255,107,107,0.12)', cursor: 'pointer' }}>
        <Trash2 size={14} color="#ff6b6b" />
      </button>
    </div>
  )
}

function JsonViewer({ data, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(depth > 1)
  if (data === null) return <span style={{ color: '#ff6b6b' }}>null</span>
  if (typeof data === 'boolean') return <span style={{ color: '#ffc400' }}>{String(data)}</span>
  if (typeof data === 'number') return <span style={{ color: '#00ff88' }}>{data}</span>
  if (typeof data === 'string') return <span style={{ color: '#a78bfa' }}>"{data}"</span>
  if (Array.isArray(data)) {
    if (data.length === 0) return <span style={{ color: '#94a3b8' }}>[]</span>
    return (
      <span>
        <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00d4ff', fontSize: 12, padding: '0 2px' }}>
          {collapsed ? <ChevronRight size={12} style={{ display: 'inline' }} /> : <ChevronDown size={12} style={{ display: 'inline' }} />} [{data.length}]
        </button>
        {!collapsed && (
          <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(0,212,255,0.1)' }}>
            {data.map((item, i) => (
              <div key={i} style={{ fontSize: 12, lineHeight: 1.8 }}>
                <JsonViewer data={item} depth={depth + 1} />
                {i < data.length - 1 && <span style={{ color: '#475569' }}>,</span>}
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) return <span style={{ color: '#94a3b8' }}>{'{}'}</span>
    return (
      <span>
        <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00d4ff', fontSize: 12, padding: '0 2px' }}>
          {collapsed ? <ChevronRight size={12} style={{ display: 'inline' }} /> : <ChevronDown size={12} style={{ display: 'inline' }} />} {'{'}…{'}'}
        </button>
        {!collapsed && (
          <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(0,212,255,0.1)' }}>
            {keys.map((k, i) => (
              <div key={k} style={{ fontSize: 12, lineHeight: 1.8 }}>
                <span style={{ color: '#00d4ff' }}>"{k}"</span>
                <span style={{ color: '#475569' }}>: </span>
                <JsonViewer data={data[k]} depth={depth + 1} />
                {i < keys.length - 1 && <span style={{ color: '#475569' }}>,</span>}
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }
  return <span style={{ color: '#94a3b8' }}>{String(data)}</span>
}

export default function APIConnect() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/users')
  const [headers, setHeaders] = useState([{ key: 'Accept', value: 'application/json' }])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState(null)
  const [activeTab, setActiveTab] = useState('headers')
  const [responseTab, setResponseTab] = useState('json')
  const [connections, setConnections] = useState(savedConnections)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])
  const abortRef = useRef(null)

  const sendRequest = async () => {
    if (!url.trim()) return
    setSending(true)
    setResponse(null)

    const controller = new AbortController()
    abortRef.current = controller
    const startTime = Date.now()

    try {
      const hdrs = {}
      headers.filter(h => h.key && h.value).forEach(h => { hdrs[h.key] = h.value })

      const opts = { method, headers: hdrs, signal: controller.signal }
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) opts.body = body

      const res = await fetch(url, opts)
      const elapsed = Date.now() - startTime
      const text = await res.text()
      let json = null
      try { json = JSON.parse(text) } catch (_) {}

      const result = {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        elapsed,
        size: new Blob([text]).size,
        headers: Object.fromEntries([...res.headers.entries()]),
        body: text,
        json,
      }
      setResponse(result)
      setHistory(prev => [{ method, url, status: res.status, elapsed, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)])
    } catch (err) {
      if (err.name !== 'AbortError') {
        const elapsed = Date.now() - startTime
        setResponse({ status: 0, statusText: err.message, ok: false, elapsed, body: err.message, json: null, headers: {}, size: 0 })
        setHistory(prev => [{ method, url, status: 'ERR', elapsed, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)])
      }
    } finally {
      setSending(false)
    }
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(response?.body || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const statusColor = s => s >= 200 && s < 300 ? '#00ff88' : s >= 400 ? '#ff6b6b' : '#ffc400'

  return (
    <div>
      <div className="bg-orb bg-orb-purple" style={{ width: 400, height: 400, top: -100, right: -50, opacity: 0.3 }} />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}><span className="gradient-text">API Connect</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Test REST APIs, manage connections, and ingest live data</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Left: Saved Connections + History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Presets */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card" style={{ padding: 16 }}>
            <h3 style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Examples</h3>
            {presetExamples.map((ex, i) => (
              <button key={i} onClick={() => { setUrl(ex.url); setMethod(ex.method) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', cursor: 'pointer',
                  marginBottom: 6, textAlign: 'left', transition: 'all 0.2s' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${METHOD_COLORS[ex.method]}20`, color: METHOD_COLORS[ex.method] }}>{ex.method}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.label}</span>
              </button>
            ))}
          </motion.div>

          {/* Saved Connections */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saved Connections</h3>
              <button className="btn-ghost btn-sm" style={{ fontSize: 11 }}><Plus size={12} /> Add</button>
            </div>
            {connections.map(conn => (
              <div key={conn.id} onClick={() => { setUrl(conn.url); setMethod(conn.method) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', borderRadius: 8, cursor: 'pointer',
                  marginBottom: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: conn.status === 'active' ? '#00ff88' : '#475569', flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{conn.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.url}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: `${METHOD_COLORS[conn.method]}20`, color: METHOD_COLORS[conn.method], flexShrink: 0 }}>{conn.method}</span>
              </div>
            ))}
          </motion.div>

          {/* History */}
          {history.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: 16 }}>
              <h3 style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Request History</h3>
              {history.map((h, i) => (
                <div key={i} onClick={() => setUrl(h.url)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: METHOD_COLORS[h.method] || '#94a3b8' }}>{h.method}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url.replace('https://', '')}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(h.status) }}>{h.status}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Right: Request Builder + Response */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* URL Bar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <select value={method} onChange={e => setMethod(e.target.value)}
                className="input-glass" style={{ width: 100, cursor: 'pointer', color: METHOD_COLORS[method], fontWeight: 700 }}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input className="input-glass" placeholder="Enter request URL…" value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendRequest()}
                style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} />
              <button className="btn-primary" onClick={sendRequest} disabled={sending}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', flexShrink: 0 }}>
                {sending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, marginBottom: 14, width: 'fit-content' }}>
              {['headers', 'body', 'auth'].map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: activeTab === t ? 'rgba(0,212,255,0.2)' : 'transparent',
                    color: activeTab === t ? '#00d4ff' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 600, transition: 'all 0.2s', textTransform: 'capitalize' }}>{t}</button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'headers' && (
                <motion.div key="headers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {headers.map((h, i) => (
                    <HeaderRow key={i} header={h}
                      onChange={updated => setHeaders(prev => prev.map((x, idx) => idx === i ? updated : x))}
                      onRemove={() => setHeaders(prev => prev.filter((_, idx) => idx !== i))} />
                  ))}
                  <button className="btn-ghost btn-sm" onClick={() => setHeaders(prev => [...prev, { key: '', value: '' }])}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={12} /> Add Header
                  </button>
                </motion.div>
              )}
              {activeTab === 'body' && (
                <motion.div key="body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <textarea className="input-glass" placeholder='{ "key": "value" }' value={body}
                    onChange={e => setBody(e.target.value)}
                    style={{ width: '100%', minHeight: 120, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
                </motion.div>
              )}
              {activeTab === 'auth' && (
                <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Auth Type</label>
                      <select className="input-glass" style={{ cursor: 'pointer' }}>
                        <option>Bearer Token</option><option>API Key</option><option>Basic Auth</option><option>No Auth</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Token / Key</label>
                      <input className="input-glass" placeholder="Enter token…" type="password" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Response */}
          <AnimatePresence>
            {(response || sending) && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card" style={{ padding: 16 }}>
                {sending ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 20, justifyContent: 'center' }}>
                    <Loader2 size={24} color="#00d4ff" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Sending request…</span>
                  </div>
                ) : (
                  <>
                    {/* Response Status Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {response.ok ? <CheckCircle size={16} color="#00ff88" /> : <XCircle size={16} color="#ff6b6b" />}
                        <span style={{ fontWeight: 700, fontSize: 16, color: statusColor(response.status) }}>{response.status}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{response.statusText}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {response.elapsed}ms
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {response.size > 1024 ? `${(response.size / 1024).toFixed(1)} KB` : `${response.size} B`}
                      </span>
                      <button onClick={copyResponse} className="btn-ghost btn-sm" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {copied ? <CheckCircle size={12} color="#00ff88" /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    {/* Response Tabs */}
                    <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, marginBottom: 12, width: 'fit-content' }}>
                      {['json', 'raw', 'headers'].map(t => (
                        <button key={t} onClick={() => setResponseTab(t)}
                          style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: responseTab === t ? 'rgba(0,212,255,0.2)' : 'transparent',
                            color: responseTab === t ? '#00d4ff' : 'var(--text-secondary)',
                            fontSize: 12, fontWeight: 600, transition: 'all 0.2s', textTransform: 'capitalize' }}>{t}</button>
                      ))}
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14, maxHeight: 360, overflowY: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.7 }}>
                      {responseTab === 'json' && response.json && <JsonViewer data={response.json} />}
                      {responseTab === 'raw' && <pre style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{response.body}</pre>}
                      {responseTab === 'headers' && Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: 6 }}>
                          <span style={{ color: '#00d4ff' }}>{k}</span>
                          <span style={{ color: '#475569' }}>: </span>
                          <span style={{ color: '#e2e8f0' }}>{v}</span>
                        </div>
                      ))}
                      {responseTab === 'json' && !response.json && (
                        <span style={{ color: '#ff6b6b' }}>Response is not valid JSON — check "Raw" tab</span>
                      )}
                    </div>

                    {response.ok && response.json && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button className="btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Link size={12} /> Import to Dataset
                        </button>
                        <button className="btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <RefreshCw size={12} /> Schedule Sync
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
