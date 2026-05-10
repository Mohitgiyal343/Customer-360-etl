import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Shield, Key, Palette, Database, Globe,
  Save, Eye, EyeOff, CheckCircle, Copy, RefreshCw, Trash2,
  Moon, Sun, Monitor, Mail, Webhook, AlertTriangle, Plus, Link2, Zap
} from 'lucide-react'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

const Toggle = ({ checked, onChange, color = '#00d4ff' }) => (
  <div onClick={() => onChange(!checked)}
    style={{
      width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'all 0.3s',
      background: checked ? color : 'rgba(255,255,255,0.1)', flexShrink: 0,
    }}>
    <div style={{
      position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
      borderRadius: '50%', background: 'white', transition: 'left 0.3s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    }} />
  </div>
)

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>{title}</h3>
      {children}
    </div>
  )
}

function SettingRow({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>}
      </div>
      <div style={{ marginLeft: 24 }}>{children}</div>
    </div>
  )
}

const apiKeys = [
  { id: 1, name: 'Production API Key', key: 'c360_prod_7k2mxp...3f9q', created: '2026-03-12', lastUsed: '2 hours ago', status: 'active' },
  { id: 2, name: 'Development Key', key: 'c360_dev_4xmz1n...8r2w', created: '2026-04-01', lastUsed: '5 days ago', status: 'active' },
  { id: 3, name: 'Analytics Export', key: 'c360_exp_9lk4vu...1m7c', created: '2026-04-20', lastUsed: 'Never', status: 'inactive' },
]

const integrations = [
  { id: 1, name: 'Salesforce', icon: '☁️', desc: 'Sync CRM data and leads', connected: true, color: '#00a1e0' },
  { id: 2, name: 'Slack', icon: '💬', desc: 'Get alerts and reports in Slack', connected: true, color: '#4a154b' },
  { id: 3, name: 'Stripe', icon: '💳', desc: 'Import billing and revenue data', connected: false, color: '#635bff' },
  { id: 4, name: 'HubSpot', icon: '🧲', desc: 'Sync marketing and contact data', connected: false, color: '#ff7a59' },
  { id: 5, name: 'Google Analytics', icon: '📊', desc: 'Import web and app analytics', connected: true, color: '#fbbc04' },
  { id: 6, name: 'Snowflake', icon: '❄️', desc: 'Connect your data warehouse', connected: false, color: '#29b5e8' },
]

export default function Settings() {
  const [tab, setTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState({})
  const [copiedKey, setCopiedKey] = useState(null)
  const [intgs, setIntgs] = useState(integrations)

  // Profile state
  const [profile, setProfile] = useState({ name: 'Mohit Sharma', email: 'mohit@customer360.ai', role: 'Admin', company: 'Customer360 AI', timezone: 'Asia/Kolkata' })
  // Notification state
  const [notifs, setNotifs] = useState({ email_alerts: true, slack_alerts: true, churn_alerts: true, revenue_alerts: false, weekly_digest: true, ml_complete: true })
  // Appearance
  const [theme, setTheme] = useState('dark')
  const [accentColor, setAccentColor] = useState('#00d4ff')
  // Security
  const [mfa, setMfa] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState('8h')

  const saveSettings = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const copyApiKey = (key) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const toggleIntegration = (id) => {
    setIntgs(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i))
  }

  return (
    <div>
      <div className="bg-orb bg-orb-blue" style={{ width: 400, height: 400, top: -100, left: -50, opacity: 0.2 }} />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}><span className="gradient-text">Settings</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Manage your account, integrations, and platform preferences</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        {/* Tab Sidebar */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card" style={{ padding: 12, height: 'fit-content' }}>
          {TABS.map((t, i) => {
            const Icon = t.icon
            const isActive = tab === t.id
            return (
              <motion.button key={t.id} onClick={() => setTab(t.id)}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: 'none', cursor: 'pointer', marginBottom: 4, textAlign: 'left', transition: 'all 0.2s',
                  background: isActive ? 'rgba(0,212,255,0.12)' : 'transparent',
                  color: isActive ? '#00d4ff' : 'var(--text-secondary)' }}>
                <Icon size={16} />
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500 }}>{t.label}</span>
                {isActive && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#00d4ff' }} />}
              </motion.button>
            )
          })}
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
            className="glass-card" style={{ padding: 28 }}>

            {tab === 'profile' && (
              <div>
                <Section title="Personal Information">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{profile.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{profile.role} · {profile.company}</div>
                      <button className="btn-ghost btn-sm" style={{ marginTop: 8 }}>Change Avatar</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[['Full Name', 'name'], ['Email Address', 'email'], ['Job Role', 'role'], ['Company', 'company']].map(([label, key]) => (
                      <div key={key}>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
                        <input className="input-glass" value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} />
                      </div>
                    ))}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Timezone</label>
                      <select className="input-glass" value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} style={{ cursor: 'pointer' }}>
                        <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
                      </select>
                    </div>
                  </div>
                </Section>
              </div>
            )}

            {tab === 'notifications' && (
              <div>
                <Section title="Email Notifications">
                  <SettingRow label="Churn Risk Alerts" desc="Get notified when customers are at risk"><Toggle checked={notifs.churn_alerts} onChange={v => setNotifs(p => ({ ...p, churn_alerts: v }))} color="#ff6b6b" /></SettingRow>
                  <SettingRow label="Revenue Milestones" desc="Notify on revenue target hit / miss"><Toggle checked={notifs.revenue_alerts} onChange={v => setNotifs(p => ({ ...p, revenue_alerts: v }))} color="#00ff88" /></SettingRow>
                  <SettingRow label="Weekly Digest" desc="Summary of key metrics every Monday"><Toggle checked={notifs.weekly_digest} onChange={v => setNotifs(p => ({ ...p, weekly_digest: v }))} /></SettingRow>
                  <SettingRow label="ML Training Complete" desc="Notify when model training finishes"><Toggle checked={notifs.ml_complete} onChange={v => setNotifs(p => ({ ...p, ml_complete: v }))} color="#8b5cf6" /></SettingRow>
                </Section>
                <Section title="Delivery Channels">
                  <SettingRow label="Email Alerts" desc="Send to mohit@customer360.ai"><Toggle checked={notifs.email_alerts} onChange={v => setNotifs(p => ({ ...p, email_alerts: v }))} /></SettingRow>
                  <SettingRow label="Slack Notifications" desc="Post to #data-alerts channel"><Toggle checked={notifs.slack_alerts} onChange={v => setNotifs(p => ({ ...p, slack_alerts: v }))} color="#4a154b" /></SettingRow>
                </Section>
              </div>
            )}

            {tab === 'security' && (
              <div>
                <Section title="Authentication">
                  <SettingRow label="Two-Factor Authentication" desc="Protect your account with TOTP or SMS MFA">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {mfa && <span className="badge badge-green">Enabled</span>}
                      <Toggle checked={mfa} onChange={setMfa} color="#00ff88" />
                    </div>
                  </SettingRow>
                  <SettingRow label="Session Timeout" desc="Automatically log out after inactivity">
                    <select className="input-glass" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} style={{ cursor: 'pointer', width: 120 }}>
                      <option value="1h">1 hour</option><option value="4h">4 hours</option>
                      <option value="8h">8 hours</option><option value="24h">24 hours</option>
                    </select>
                  </SettingRow>
                </Section>
                <Section title="Active Sessions">
                  {[
                    { device: 'Chrome on Windows', location: 'Mumbai, IN', time: 'Active now', current: true },
                    { device: 'Safari on iPhone', location: 'Mumbai, IN', time: '2 hours ago', current: false },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {s.device} {s.current && <span className="badge badge-green" style={{ fontSize: 10 }}>Current</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.location} · {s.time}</div>
                      </div>
                      {!s.current && <button className="btn-ghost btn-sm" style={{ color: '#ff6b6b' }}>Revoke</button>}
                    </div>
                  ))}
                </Section>
                <Section title="Danger Zone">
                  <div style={{ padding: 16, borderRadius: 10, border: '1px solid rgba(255,107,107,0.2)', background: 'rgba(255,107,107,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <AlertTriangle size={16} color="#ff6b6b" />
                      <span style={{ fontWeight: 600, color: '#ff6b6b' }}>Delete Account</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
                    <button className="btn-ghost btn-sm" style={{ border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b' }}>Request Account Deletion</button>
                  </div>
                </Section>
              </div>
            )}

            {tab === 'api-keys' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontWeight: 600, marginBottom: 4 }}>API Keys</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use these keys to authenticate with the Customer360 REST API</p>
                  </div>
                  <button className="btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={12} /> Generate New Key
                  </button>
                </div>
                {apiKeys.map(k => (
                  <div key={k.id} style={{ padding: '16px 18px', borderRadius: 12, marginBottom: 12,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{k.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created {k.created} · Last used: {k.lastUsed}</div>
                      </div>
                      <span className={`badge badge-${k.status === 'active' ? 'green' : 'yellow'}`}>{k.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', color: showKey[k.id] ? '#00d4ff' : 'var(--text-muted)', letterSpacing: showKey[k.id] ? 'normal' : '0.1em' }}>
                        {showKey[k.id] ? k.key.replace('...', 'ab12cd34ef56') : '•'.repeat(20) + k.key.slice(-4)}
                      </code>
                      <button onClick={() => setShowKey(p => ({ ...p, [k.id]: !p[k.id] }))} className="btn-ghost btn-sm">
                        {showKey[k.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => copyApiKey(k.key)} className="btn-ghost btn-sm">
                        {copiedKey === k.key ? <CheckCircle size={13} color="#00ff88" /> : <Copy size={13} />}
                      </button>
                      <button className="btn-ghost btn-sm"><Trash2 size={13} color="#ff6b6b" /></button>
                    </div>
                  </div>
                ))}
                <div style={{ padding: 14, borderRadius: 10, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', fontSize: 12, color: 'var(--text-muted)' }}>
                  🔒 API keys grant full access to your data. Never share them publicly or commit to version control.
                </div>
              </div>
            )}

            {tab === 'integrations' && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Connected Integrations</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connect your tools and data sources to Customer360</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {intgs.map(intg => (
                    <div key={intg.id} style={{ padding: '16px 18px', borderRadius: 12, border: `1px solid ${intg.connected ? `${intg.color}30` : 'rgba(255,255,255,0.07)'}`, background: intg.connected ? `${intg.color}08` : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 24 }}>{intg.icon}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{intg.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{intg.desc}</div>
                          </div>
                        </div>
                        {intg.connected && <CheckCircle size={14} color="#00ff88" />}
                      </div>
                      <button onClick={() => toggleIntegration(intg.id)}
                        className={intg.connected ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
                        style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                        {intg.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'appearance' && (
              <div>
                <Section title="Theme">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 8 }}>
                    {[['dark', 'Dark', Moon, '#050818'], ['light', 'Light', Sun, '#f8fafc'], ['system', 'System', Monitor, 'linear-gradient(135deg, #050818 50%, #f8fafc 50%)']].map(([id, label, Icon, bg]) => (
                      <button key={id} onClick={() => setTheme(id)}
                        style={{ padding: '16px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${theme === id ? '#00d4ff' : 'rgba(255,255,255,0.07)'}`, background: 'rgba(255,255,255,0.03)', transition: 'all 0.2s' }}>
                        <div style={{ width: '100%', height: 52, borderRadius: 8, background: bg, marginBottom: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                          <Icon size={13} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </Section>
                <Section title="Accent Color">
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {['#00d4ff', '#8b5cf6', '#00ff88', '#ffc400', '#ff6b6b', '#f43f5e', '#06b6d4', '#a855f7'].map(color => (
                      <button key={color} onClick={() => setAccentColor(color)}
                        style={{ width: 36, height: 36, borderRadius: 10, background: color, border: `3px solid ${accentColor === color ? 'white' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.2s', transform: accentColor === color ? 'scale(1.15)' : 'scale(1)' }} />
                    ))}
                  </div>
                </Section>
                <Section title="Data Density">
                  <SettingRow label="Compact Tables" desc="Show more rows with reduced row height">
                    <Toggle checked={false} onChange={() => {}} />
                  </SettingRow>
                  <SettingRow label="Animated Charts" desc="Enable smooth chart animations">
                    <Toggle checked={true} onChange={() => {}} />
                  </SettingRow>
                </Section>
              </div>
            )}

            {/* Save Button (not for integrations/api-keys) */}
            {!['integrations', 'api-keys'].includes(tab) && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={saveSettings} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {saved ? <CheckCircle size={15} /> : <Save size={15} />}
                  {saved ? 'Saved!' : 'Save Changes'}
                </button>
                <button className="btn-ghost">Cancel</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
