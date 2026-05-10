import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Upload, Globe, Wand2, GitBranch,
  BarChart3, Brain, Cpu, FileText, Settings,
  ChevronLeft, ChevronRight, Zap, Database
} from 'lucide-react'

const navItems = [
  { id: 'dashboard',   label: 'Dashboard',          icon: LayoutDashboard, path: '/app/dashboard',  color: '#00d4ff' },
  { id: 'upload',      label: 'Upload Data',         icon: Upload,          path: '/app/upload',     color: '#00ff88' },
  { id: 'api-connect', label: 'API Connect',         icon: Globe,           path: '/app/api-connect',color: '#8b5cf6' },
  { id: 'cleaning',    label: 'Data Cleaning Studio',icon: Wand2,           path: '/app/cleaning',   color: '#00d4ff' },
  { id: 'etl',         label: 'ETL Pipelines',       icon: GitBranch,       path: '/app/etl',        color: '#00ff88' },
  { id: 'analytics',   label: 'Analytics',           icon: BarChart3,       path: '/app/analytics',  color: '#8b5cf6' },
  { id: 'insights',    label: 'AI Insights',         icon: Brain,           path: '/app/insights',   color: '#00d4ff' },
  { id: 'ml',          label: 'Machine Learning',    icon: Cpu,             path: '/app/ml',         color: '#00ff88' },
  { id: 'reports',     label: 'Reports',             icon: FileText,        path: '/app/reports',    color: '#8b5cf6' },
  { id: 'settings',    label: 'Settings',            icon: Settings,        path: '/app/settings',   color: '#94a3b8' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <motion.aside
      className="sidebar"
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 mb-2 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)' }}>
          <Database size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              <div className="font-bold text-white text-[15px] leading-tight">Customer360</div>
              <div className="text-[10px] font-semibold tracking-widest"
                style={{ color: '#00d4ff' }}>AI PLATFORM</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, i) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <motion.button
              key={item.id}
              className={`sidebar-item w-full text-left ${isActive ? 'active' : ''}`}
              style={isActive ? { '--accent': item.color } : {}}
              onClick={() => navigate(item.path)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Icon
                size={18}
                style={{ color: isActive ? item.color : undefined, flexShrink: 0 }}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap text-sm"
                    style={{ color: isActive ? item.color : undefined }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: item.color }}
                  layoutId="activeDot"
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
            text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* AI Status Indicator */}
      {!collapsed && (
        <motion.div
          className="mx-3 mb-3 p-3 rounded-xl"
          style={{ background: 'rgba(0, 255, 136, 0.06)', border: '1px solid rgba(0, 255, 136, 0.15)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-semibold">AI Engine Active</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">3 models running</div>
        </motion.div>
      )}
    </motion.aside>
  )
}
