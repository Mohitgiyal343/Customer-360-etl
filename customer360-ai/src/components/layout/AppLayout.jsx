import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import AIChatbot from '../AIChatbot'
import { useAppStore } from '../../store'
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'

const TOAST_ICONS = {
  success: { Icon: CheckCircle, color: '#00ff88', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)' },
  warning: { Icon: AlertTriangle, color: '#ffc400', bg: 'rgba(255,196,0,0.08)', border: 'rgba(255,196,0,0.2)' },
  error:   { Icon: XCircle,     color: '#ff6b6b', bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.2)' },
  info:    { Icon: Info,        color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)' },
}

function ToastBar() {
  const notifications = useAppStore(s => s.notifications)
  return (
    <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      <AnimatePresence>
        {notifications.map(n => {
          const { Icon, color, bg, border } = TOAST_ICONS[n.type] || TOAST_ICONS.info
          return (
            <motion.div key={n.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
                background: bg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)',
                minWidth: 280, maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <Icon size={16} color={color} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{n.msg}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const location = useLocation()

  const sidebarWidth = sidebarCollapsed ? 72 : 260

  return (
    <div className="min-h-screen" style={{ background: '#050818' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
      <Navbar collapsed={sidebarCollapsed} darkMode={darkMode} onToggleDark={() => setDarkMode(v => !v)} />

      <motion.main
        className="page-content"
        style={{ marginLeft: sidebarWidth }}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}>
          <Outlet />
        </motion.div>
      </motion.main>

      <ToastBar />
      <AIChatbot />
    </div>
  )
}
