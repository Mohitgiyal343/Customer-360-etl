import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Brain, Play, CheckCircle, Loader2, Target, Zap } from 'lucide-react'
import { useAppStore } from '../store'

const models = [
  { id:'churn', label:'Churn Prediction', icon:'⚠️', color:'#ff6b6b', desc:'Binary classifier — predict which customers will churn in 30 days' },
  { id:'forecast', label:'Sales Forecast', icon:'📈', color:'#00d4ff', desc:'Time-series regression — revenue forecast for next 90 days' },
  { id:'segment', label:'Customer Segmentation', icon:'🎯', color:'#8b5cf6', desc:'K-Means clustering — group customers by behaviour & value' },
  { id:'fraud', label:'Fraud Detection', icon:'🔐', color:'#ffc400', desc:'Anomaly detection — identify unusual transaction patterns' },
]

const metrics = {
  churn:   { accuracy:0.924, precision:0.891, recall:0.876, f1:0.883, auc:0.961 },
  forecast:{ accuracy:0.887, precision:0.0, recall:0.0, f1:0.0, auc:0.0, rmse:1842, mape:4.3 },
  segment: { accuracy:0.0, precision:0.0, recall:0.0, f1:0.0, silhouette:0.72, clusters:4 },
  fraud:   { accuracy:0.978, precision:0.934, recall:0.812, f1:0.869, auc:0.994 },
}

const confMatrix = {
  churn:   [[8421,312],[189,1078]],
  fraud:   [[19840,142],[89,429]],
  segment: null, forecast: null,
}

const featureImportance = {
  churn:   [{ f:'days_since_login',v:0.28},{ f:'support_tickets',v:0.21},{ f:'plan_tier',v:0.18},{ f:'monthly_spend',v:0.15},{ f:'sessions_30d',v:0.12},{ f:'nps_score',v:0.06}],
  forecast:[{ f:'prev_quarter',v:0.35},{ f:'seasonality',v:0.25},{ f:'marketing_spend',v:0.20},{ f:'headcount',v:0.12},{ f:'events',v:0.08}],
  segment: [{ f:'ltv',v:0.32},{ f:'frequency',v:0.28},{ f:'recency',v:0.22},{ f:'aov',v:0.18}],
  fraud:   [{ f:'tx_velocity',v:0.31},{ f:'geo_mismatch',v:0.24},{ f:'amount_z',v:0.21},{ f:'device_age',v:0.14},{ f:'time_of_day',v:0.10}],
}

const radarData = {
  churn:   [{ m:'Accuracy',v:92.4},{ m:'Precision',v:89.1},{ m:'Recall',v:87.6},{ m:'F1',v:88.3},{ m:'AUC',v:96.1}],
  fraud:   [{ m:'Accuracy',v:97.8},{ m:'Precision',v:93.4},{ m:'Recall',v:81.2},{ m:'F1',v:86.9},{ m:'AUC',v:99.4}],
  segment: [{ m:'Silhouette',v:72},{ m:'Clusters',v:40},{ m:'Inertia',v:65},{ m:'Coverage',v:98},{ m:'Balance',v:80}],
  forecast:[{ m:'Accuracy',v:88.7},{ m:'MAPE',v:57},{ m:'Coverage',v:90},{ m:'Stability',v:82},{ m:'Lag-fit',v:78}],
}

const MetricCard = ({ label, value, color='#00d4ff', suffix='' }) => (
  <div style={{ padding:'14px 16px', borderRadius:10, background:`${color}10`, border:`1px solid ${color}25`, textAlign:'center' }}>
    <div style={{ fontSize:24, fontWeight:800, color }}>{typeof value === 'number' && value < 2 ? (value*100).toFixed(1)+'%' : `${value}${suffix}`}</div>
    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{label}</div>
  </div>
)

const ConfMatrix = ({ matrix }) => {
  if (!matrix) return <div style={{ color:'var(--text-muted)', fontSize:13, padding:20, textAlign:'center' }}>N/A for this model type</div>
  const labels = ['Negative','Positive']
  const maxVal = Math.max(...matrix.flat())
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr', gap:4, alignItems:'center' }}>
        <div/>
        {labels.map(l => <div key={l} style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', fontWeight:600 }}>Pred {l}</div>)}
        {matrix.map((row,i) => [
          <div key={`l${i}`} style={{ fontSize:11, color:'var(--text-muted)', writingMode:'vertical-rl', textAlign:'center', fontWeight:600 }}>Actual {labels[i]}</div>,
          ...row.map((v,j) => {
            const isCorrect = i===j
            const alpha = 0.1 + (v/maxVal)*0.5
            return (
              <div key={j} style={{ height:70, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                background: isCorrect ? `rgba(0,255,136,${alpha})` : `rgba(255,107,107,${alpha})`,
                border:`1px solid ${isCorrect ? 'rgba(0,255,136,0.3)' : 'rgba(255,107,107,0.3)'}` }}>
                <span style={{ fontSize:20, fontWeight:800, color: isCorrect ? '#00ff88' : '#ff6b6b' }}>{v.toLocaleString()}</span>
                <span style={{ fontSize:10, color:'var(--text-muted)' }}>{i===j ? (i===0?'TN':'TP') : (i===0?'FP':'FN')}</span>
              </div>
            )
          })
        ])}
      </div>
    </div>
  )
}

export default function MachineLearning() {
  const [selectedModel, setSelectedModel] = useState('churn')
  const [training, setTraining] = useState(false)
  const [trained, setTrained] = useState(null)
  const [progress, setProgress] = useState(0)
  const [targetVar, setTargetVar] = useState('churn_flag')
  const [deployed, setDeployed] = useState({})
  const { deployModel, addNotification } = useAppStore()

  const handleDeploy = () => {
    deployModel(selectedModel, metrics[selectedModel])
    setDeployed(prev => ({ ...prev, [selectedModel]: true }))
    addNotification(`✅ ${models.find(m => m.id === selectedModel)?.label} model deployed to API endpoint`, 'success')
  }

  const trainModel = () => {
    setTraining(true); setTrained(null); setProgress(0)
    let p = 0
    const iv = setInterval(() => { p += Math.random()*8; setProgress(Math.min(p,100)); if (p >= 100) { clearInterval(iv); setTraining(false); setTrained(selectedModel) } }, 200)
  }

  const m = metrics[selectedModel]
  const feat = featureImportance[selectedModel]
  const radar = radarData[selectedModel]
  const conf = confMatrix[selectedModel]

  return (
    <div>
      <div className="bg-orb bg-orb-purple" style={{ width:500, height:500, top:-100, right:-50, opacity:0.3 }}/>

      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:700, marginBottom:6 }}><span className="gradient-text">Machine Learning</span></h1>
        <p style={{ color:'var(--text-secondary)', fontSize:14 }}>Train, evaluate and deploy predictive models</p>
      </motion.div>

      {/* Model Selector */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:12, marginBottom:28 }}>
        {models.map(mod => (
          <div key={mod.id} onClick={() => { setSelectedModel(mod.id); setTrained(null); setProgress(0) }}
            style={{ padding:'16px 18px', borderRadius:12, cursor:'pointer', transition:'all 0.25s',
              background: selectedModel===mod.id ? `${mod.color}12` : 'rgba(255,255,255,0.03)',
              border: selectedModel===mod.id ? `1.5px solid ${mod.color}50` : '1.5px solid rgba(255,255,255,0.06)',
              boxShadow: selectedModel===mod.id ? `0 0 24px ${mod.color}20` : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <span style={{ fontSize:22 }}>{mod.icon}</span>
              <span style={{ fontWeight:700, color: selectedModel===mod.id ? mod.color : 'var(--text-primary)' }}>{mod.label}</span>
              {trained===mod.id && <CheckCircle size={14} color="#00ff88" style={{ marginLeft:'auto' }}/>}
            </div>
            <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{mod.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Config + Train */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="glass-card" style={{ padding:24, marginBottom:20 }}>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Target Variable</label>
            <select className="input-glass" value={targetVar} onChange={e => setTargetVar(e.target.value)} style={{ cursor:'pointer' }}>
              <option value="churn_flag">churn_flag (0/1)</option>
              <option value="revenue_next_q">revenue_next_q ($)</option>
              <option value="segment">segment (categorical)</option>
              <option value="is_fraud">is_fraud (0/1)</option>
            </select>
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Train/Test Split</label>
            <select className="input-glass" style={{ cursor:'pointer' }}>
              <option>80/20</option><option>70/30</option><option>90/10</option>
            </select>
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Cross-Validation</label>
            <select className="input-glass" style={{ cursor:'pointer' }}>
              <option>5-Fold CV</option><option>3-Fold CV</option><option>None</option>
            </select>
          </div>
          <button className="btn-primary" onClick={trainModel} disabled={training}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', flexShrink:0 }}>
            {training ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }}/> : <Play size={16}/>}
            {training ? 'Training…' : 'Train Model'}
          </button>
        </div>

        {(training || progress > 0) && (
          <div style={{ marginTop:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{training ? 'Training in progress…' : 'Training complete'}</span>
              <span style={{ fontSize:12, color:'#00d4ff', fontWeight:600 }}>{Math.min(100,Math.round(progress))}%</span>
            </div>
            <div className="progress-bar">
              <motion.div className="progress-fill" animate={{ width:`${Math.min(100,progress)}%` }} transition={{ duration:0.3 }}/>
            </div>
          </div>
        )}
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {trained === selectedModel && (
          <motion.div key={trained} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            {/* Metric Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:12, marginBottom:20 }}>
              {m.accuracy > 0 && <MetricCard label="Accuracy" value={m.accuracy} color="#00ff88"/>}
              {m.precision > 0 && <MetricCard label="Precision" value={m.precision} color="#00d4ff"/>}
              {m.recall > 0 && <MetricCard label="Recall" value={m.recall} color="#8b5cf6"/>}
              {m.f1 > 0 && <MetricCard label="F1 Score" value={m.f1} color="#ffc400"/>}
              {m.auc > 0 && <MetricCard label="AUC-ROC" value={m.auc} color="#ff6b6b"/>}
              {m.rmse && <MetricCard label="RMSE" value={m.rmse} suffix="" color="#00d4ff"/>}
              {m.mape && <MetricCard label="MAPE" value={`${m.mape}%`} color="#8b5cf6" suffix=""/>}
              {m.silhouette && <MetricCard label="Silhouette" value={m.silhouette} color="#00ff88"/>}
              {m.clusters && <MetricCard label="Clusters" value={m.clusters} suffix="" color="#ffc400"/>}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
              {/* Feature Importance */}
              <div className="chart-container">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <Zap size={15} color="#ffc400"/>
                  <h3 style={{ fontWeight:600 }}>Feature Importance</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={feat} layout="vertical" barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false}/>
                    <XAxis type="number" tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} domain={[0,0.4]}/>
                    <YAxis type="category" dataKey="f" tick={{ fill:'var(--text-secondary)', fontSize:11 }} axisLine={false} tickLine={false} width={110}/>
                    <Tooltip formatter={v => `${(v*100).toFixed(1)}%`}/>
                    <Bar dataKey="v" name="Importance" fill="#00d4ff" radius={[0,4,4,0]} fillOpacity={0.85}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar / Conf Matrix */}
              <div className="chart-container">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <Target size={15} color="#8b5cf6"/>
                  <h3 style={{ fontWeight:600 }}>{conf ? 'Confusion Matrix' : 'Model Radar'}</h3>
                </div>
                {conf ? <ConfMatrix matrix={conf}/> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radar}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                      <PolarAngleAxis dataKey="m" tick={{ fill:'var(--text-secondary)', fontSize:11 }}/>
                      <Radar name="Score" dataKey="v" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2}/>
                      <Tooltip formatter={v => `${v}`}/>
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="glass-card-green" style={{ padding:16, display:'flex', gap:12, alignItems:'center', borderRadius:12 }}>
              <CheckCircle size={20} color="#00ff88"/>
              <div>
                <p style={{ fontWeight:600, color:'#00ff88' }}>Model ready for deployment</p>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>Export as ONNX, pickle, or push to API endpoint for real-time inference</p>
              </div>
              <button className={deployed[selectedModel] ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
                onClick={handleDeploy} disabled={deployed[selectedModel]}
                style={{ marginLeft:'auto', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                {deployed[selectedModel] ? <><CheckCircle size={13} color="#00ff88"/> Deployed</> : 'Deploy Model'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
