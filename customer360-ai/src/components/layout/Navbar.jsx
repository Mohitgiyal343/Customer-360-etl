import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Search, Bell, Sun, Moon, ChevronDown, User,
  LogOut, Settings, Shield, Sparkles, X
} from 'lucide-react'

const notifications = [
  { id: 1, type: 'insight', msg: 'AI detected revenue anomaly in Q3', time: '2m ago', unread: true },
  { id: 2, type: 'pipeline', msg: 'ETL pipeline "Sales Daily" completed', time: '15m ago', unread: true },
  { id: 3, type: 'ml', msg: 'Churn model retrained — 94.2% accuracy', time: '1h ago', unread: false },
  { id: 4, type: 'alert', msg: 'Data quality score dropped below 85%', time: '2h ago', unread: false },
]

export default function Navbar({ collapsed, darkMode, onToggleDark }) {
  const navigate = useNavigate()
  const sidebarWidth = collapsed ? 72 : 260
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const notifRef = useRef(null)
  const userRef  = useRef(null)
  const unreadCount = notifications.filter(n => n.unread).length

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
      if (userRef.current  && !userRef.current.contains(e.target))  setShowUser(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <motion.header
      className="navbar flex items-center px-6 gap-4"
      style={{ left: sidebarWidth, right: 0 }}
      animate={{ left: sidebarWidth }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input-glass pl-9 py-2 text-sm"
          placeholder="Search dashboards, pipelines, insights..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          id="navbar-search"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* AI Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', color: '#8b5cf6' }}>
          <Sparkles size={12} />
          AI Ready
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDark}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          id="theme-toggle"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all relative"
            id="notif-btn"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="notif-dot" />
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-12 w-80 glass-card rounded-2xl z-50 overflow-hidden"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
              >
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                  <span className="font-semibold text-sm text-white">Notifications</span>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-blue">{unreadCount} new</span>
                    <button onClick={() => setShowNotifs(false)}>
                      <X size={14} className="text-slate-500" />
                    </button>
                  </div>
                </div>
                <div>
                  {notifications.map(n => (
                    <div key={n.id}
                      className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${n.unread ? 'bg-blue-500/5' : ''}`}>
                      <div className="flex items-start gap-3">
                        {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />}
                        <div>
                          <p className="text-xs text-slate-300">{n.msg}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center">
                  <button className="text-xs text-blue-400 hover:text-blue-300">View all notifications</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setShowUser(v => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            id="user-menu-btn"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)' }}>
              MA
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-white">Mohit Aneja</div>
              <div className="text-[10px] text-slate-500">Admin</div>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </button>

          <AnimatePresence>
            {showUser && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-12 w-52 glass-card rounded-2xl z-50 overflow-hidden"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
              >
                <div className="p-4 border-b border-white/5">
                  <div className="text-sm font-semibold text-white">Mohit Aneja</div>
                  <div className="text-xs text-slate-400">admin@customer360.ai</div>
                </div>
                {[
                  { icon: User, label: 'Profile', action: () => {} },
                  { icon: Settings, label: 'Settings', action: () => navigate('/app/settings') },
                  { icon: Shield, label: 'Security', action: () => {} },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300
                      hover:bg-white/5 hover:text-white transition-colors">
                    <item.icon size={15} />
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-white/5">
                  <button onClick={() => navigate('/')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400
                      hover:bg-red-500/10 transition-colors">
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  )
}
