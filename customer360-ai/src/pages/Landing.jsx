import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Database, Zap, Brain, BarChart3, Shield, Globe,
  ArrowRight, Play, CheckCircle, Star, ChevronRight,
  TrendingUp, Users, Activity, Cpu, Layers, Lock
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip
} from 'recharts'

const miniData = [
  { v: 40 }, { v: 65 }, { v: 52 }, { v: 80 }, { v: 71 }, { v: 95 }, { v: 88 }, { v: 110 }
]

const features = [
  {
    icon: Upload2,  title: 'Smart Data Ingestion',
    desc: 'Upload CSV, Excel, JSON or connect any API/SQL database in seconds with auto schema detection.',
    color: '#00d4ff', gradient: 'from-blue-500/20 to-transparent'
  },
  {
    icon: Brain,    title: 'AI-Powered Cleaning',
    desc: 'Automatically detect and fix missing values, duplicates, outliers, and type mismatches.',
    color: '#8b5cf6', gradient: 'from-purple-500/20 to-transparent'
  },
  {
    icon: GitFlow,  title: 'Visual ETL Pipelines',
    desc: 'Drag-and-drop pipeline builder with 20+ node types, real-time execution and status monitoring.',
    color: '#00ff88', gradient: 'from-green-500/20 to-transparent'
  },
  {
    icon: BarChart3, title: 'Interactive Analytics',
    desc: 'Beautiful charts, heatmaps, geo maps, and funnels. Filter by any dimension in real time.',
    color: '#00d4ff', gradient: 'from-blue-500/20 to-transparent'
  },
  {
    icon: Cpu,      title: 'AutoML Engine',
    desc: 'Train churn, forecast, segmentation and fraud detection models in one click.',
    color: '#8b5cf6', gradient: 'from-purple-500/20 to-transparent'
  },
  {
    icon: MessageBot, title: 'AI Analyst Chatbot',
    desc: 'Ask questions in plain English. Get instant insights, SQL queries, and chart recommendations.',
    color: '#00ff88', gradient: 'from-green-500/20 to-transparent'
  },
]

function Upload2({ size, style }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
}
function GitFlow({ size, style }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
}
function MessageBot({ size, style }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h4"/></svg>
}

const pricing = [
  { name: 'Starter', price: 49, desc: 'For individuals and small teams', color: '#00d4ff',
    features: ['5 data sources', '10 GB storage', 'Basic ETL pipelines', 'Standard analytics', 'Email support'] },
  { name: 'Growth', price: 199, desc: 'For growing businesses', color: '#8b5cf6', popular: true,
    features: ['Unlimited data sources', '500 GB storage', 'Visual ETL builder', 'AI insights & chatbot', 'ML model training', 'Priority support'] },
  { name: 'Enterprise', price: 'Custom', desc: 'For large organizations', color: '#00ff88',
    features: ['Everything in Growth', 'Custom integrations', 'SSO & RBAC', 'SLA guarantee', 'Dedicated engineer', 'On-premise option'] },
]

const testimonials = [
  { name: 'Sarah Chen', role: 'VP of Analytics, TechCorp', avatar: 'SC',
    text: 'Customer360 AI replaced 3 separate tools. The visual ETL builder saved our team 40 hours a month.', rating: 5 },
  { name: 'Marcus Williams', role: 'Head of Data, RetailMax', avatar: 'MW',
    text: 'The AI insights are genuinely useful — not just buzzwords. It caught a revenue anomaly we had missed for 2 weeks.', rating: 5 },
  { name: 'Priya Sharma', role: 'Data Engineer, FinTech Inc', avatar: 'PS',
    text: 'Pipeline setup that used to take days now takes 30 minutes. The glassmorphism UI is beautiful too!', rating: 5 },
]

const stats = [
  { value: '10M+', label: 'Rows processed daily' },
  { value: '500+', label: 'Enterprise customers' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '94.2%', label: 'Avg ML accuracy' },
]

// Particle background
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            animationDuration: `${8 + Math.random() * 12}s`,
            animationDelay: `${Math.random() * 10}s`,
            background: i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#8b5cf6' : '#00ff88',
            opacity: 0.4 + Math.random() * 0.4,
          }}
        />
      ))}
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const heroRef = useRef(null)

  return (
    <div className="min-h-screen" style={{ background: '#050818' }}>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(5,8,24,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)' }}>
            <Database size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">Customer<span className="gradient-text-blue-purple">360 AI</span></span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Customers</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/dashboard')} className="btn-ghost btn-sm">Sign In</button>
          <button onClick={() => navigate('/app/dashboard')} className="btn-primary btn-sm">
            Start Free Trial
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient pt-20">
        <Particles />

        {/* Orbs */}
        <div className="bg-orb bg-orb-blue w-[600px] h-[600px] -top-40 -left-40" style={{ animationDelay: '0s' }} />
        <div className="bg-orb bg-orb-purple w-[500px] h-[500px] -top-20 right-0" style={{ animationDelay: '2s' }} />
        <div className="bg-orb bg-orb-green w-[400px] h-[400px] bottom-0 left-1/3" style={{ animationDelay: '4s' }} />

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)' }}
          >
            <Zap size={14} style={{ color: '#00d4ff' }} />
            <span className="text-sm font-semibold" style={{ color: '#00d4ff' }}>Powered by GPT-4 + Custom ML Models</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white leading-[1.08] mb-6"
          >
            Transform Raw Data Into
            <br />
            <span className="gradient-text">AI-Powered Insights</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Enterprise ETL pipelines, interactive analytics, AutoML, and an AI analyst
            — all in one stunning platform. No code required.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button
              id="hero-cta-start"
              onClick={() => navigate('/app/dashboard')}
              className="btn-primary flex items-center gap-2 text-base px-8 py-4"
            >
              <Zap size={18} />
              Start Analyzing Free
              <ArrowRight size={16} />
            </button>
            <button
              id="hero-cta-demo"
              onClick={() => navigate('/app/dashboard')}
              className="btn-ghost flex items-center gap-2 text-base px-8 py-4"
            >
              <Play size={16} />
              Watch Demo
            </button>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8"
          >
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-black gradient-text">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl"
          style={{ transform: 'translateX(-50%) perspective(1200px) rotateX(8deg)' }}
        >
          <div className="glass-card p-4 rounded-2xl"
            style={{ background: 'rgba(10,15,30,0.9)', border: '1px solid rgba(0,212,255,0.2)' }}>
            {/* Mock dashboard bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="ml-4 text-xs text-slate-500 font-mono">customer360.ai/app/dashboard</div>
            </div>
            {/* Mini KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Revenue', val: '$2.4M', color: '#00d4ff', up: '+12.3%' },
                { label: 'Customers', val: '14,291', color: '#00ff88', up: '+8.1%' },
                { label: 'Churn Rate', val: '3.2%', color: '#8b5cf6', down: '-0.5%' },
                { label: 'Avg LTV', val: '$1,840', color: '#00d4ff', up: '+5.6%' },
              ].map(k => (
                <div key={k.label} className="glass-card p-3 rounded-xl">
                  <div className="text-[10px] text-slate-500 mb-1">{k.label}</div>
                  <div className="text-sm font-bold" style={{ color: k.color }}>{k.val}</div>
                  <div className={`text-[10px] mt-1 ${k.up ? 'text-green-400' : 'text-red-400'}`}>{k.up || k.down}</div>
                </div>
              ))}
            </div>
            {/* Mini Charts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-3 rounded-xl col-span-2">
                <div className="text-[10px] text-slate-500 mb-2">Revenue Trend</div>
                <ResponsiveContainer width="100%" height={60}>
                  <AreaChart data={miniData}>
                    <defs>
                      <linearGradient id="lp-rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#00d4ff" strokeWidth={2} fill="url(#lp-rev)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card p-3 rounded-xl flex flex-col items-center justify-center gap-1">
                <Brain size={20} style={{ color: '#8b5cf6' }} />
                <div className="text-[10px] text-slate-400 text-center">AI found 3 insights</div>
                <div className="badge badge-purple text-[9px]">VIEW</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="badge badge-blue mb-4 inline-block">FEATURES</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Everything you need to <span className="gradient-text">master your data</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            From raw CSV uploads to trained ML models — Customer360 AI handles the entire data lifecycle.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }} viewport={{ once: true }}
              className="glass-card p-6 rounded-2xl group cursor-pointer"
              whileHover={{ y: -6 }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              <div className="flex items-center gap-1 mt-4 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: f.color }}>
                Learn more <ChevronRight size={14} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Workflow Visualization ── */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            Your data pipeline in <span className="gradient-text">5 simple steps</span>
          </h2>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          {[
            { step: 1, label: 'Upload Data',    icon: '📤', color: '#00d4ff' },
            { step: 2, label: 'AI Cleans',      icon: '🧹', color: '#8b5cf6' },
            { step: 3, label: 'Build Pipeline', icon: '⚡', color: '#00ff88' },
            { step: 4, label: 'Train Models',   icon: '🤖', color: '#00d4ff' },
            { step: 5, label: 'Get Insights',   icon: '📊', color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="flex flex-col items-center gap-2"
                whileHover={{ y: -4 }}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                  {s.icon}
                </div>
                <span className="text-xs font-semibold" style={{ color: s.color }}>Step {s.step}</span>
                <span className="text-xs text-slate-400">{s.label}</span>
              </motion.div>
              {i < 4 && (
                <div className="hidden md:flex items-center mx-2">
                  <div className="w-8 h-px" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                  <ArrowRight size={14} className="text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-28 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-16"
        >
          <div className="badge badge-green mb-4 inline-block">PRICING</div>
          <h2 className="text-4xl font-black text-white mb-3">Simple, transparent pricing</h2>
          <p className="text-slate-400">No hidden fees. Cancel any time.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {pricing.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} viewport={{ once: true }}
              className={`glass-card p-8 rounded-2xl relative ${plan.popular ? 'border-purple-500/40' : ''}`}
              whileHover={{ y: -6 }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="badge badge-purple text-xs px-4 py-1">MOST POPULAR</div>
                </div>
              )}
              <div className="text-sm font-semibold mb-1" style={{ color: plan.color }}>{plan.name}</div>
              <div className="text-4xl font-black text-white mb-1">
                {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                {typeof plan.price === 'number' && <span className="text-base font-normal text-slate-400">/mo</span>}
              </div>
              <div className="text-sm text-slate-400 mb-6">{plan.desc}</div>

              <button onClick={() => navigate('/app/dashboard')}
                className="w-full btn-primary mb-6" style={plan.popular ? {} : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Get Started
              </button>

              <ul className="space-y-3">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle size={15} style={{ color: plan.color, flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-20 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            Loved by data teams <span className="gradient-text">worldwide</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} viewport={{ once: true }}
              className="glass-card p-6 rounded-2xl"
              whileHover={{ y: -4 }}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={14} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)' }}>
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto glass-card p-12 rounded-3xl text-center relative overflow-hidden"
          style={{ border: '1px solid rgba(0,212,255,0.2)' }}
        >
          <div className="bg-orb bg-orb-blue w-80 h-80 -top-20 -left-20" />
          <div className="bg-orb bg-orb-purple w-60 h-60 -bottom-10 right-0" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              Ready to transform your data?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Join 500+ companies using Customer360 AI to unlock the full potential of their customer data.
            </p>
            <button onClick={() => navigate('/app/dashboard')}
              id="footer-cta" className="btn-primary text-base px-10 py-4 flex items-center gap-2 mx-auto">
              <Zap size={18} />
              Start Free — No Credit Card Required
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)' }}>
              <Database size={14} className="text-white" />
            </div>
            <span className="font-bold text-white">Customer360 AI</span>
          </div>
          <div className="text-sm text-slate-500">
            © 2025 Customer360 AI. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <Lock size={12} className="text-slate-600" />
            <span className="text-xs text-slate-600">SOC2 Type II Certified</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
