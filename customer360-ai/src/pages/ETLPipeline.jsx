import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactFlow, {
  addEdge, useNodesState, useEdgesState,
  Background, Controls, MiniMap,
  Handle, Position
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Play, Plus, Trash2, CheckCircle, AlertCircle, Loader2, Terminal } from 'lucide-react'

const NODE_TYPES_DEF = [
  { type:'source', label:'Data Source', icon:'🗂️', color:'#00d4ff', desc:'CSV / DB / API' },
  { type:'fetch', label:'API Fetch', icon:'🌐', color:'#8b5cf6', desc:'REST endpoint' },
  { type:'clean', label:'Clean', icon:'🧹', color:'#00ff88', desc:'Remove nulls / dupes' },
  { type:'transform', label:'Transform', icon:'⚙️', color:'#ffc400', desc:'Map, filter, cast' },
  { type:'aggregate', label:'Aggregate', icon:'📊', color:'#ff6b6b', desc:'Group by / rollup' },
  { type:'ml', label:'ML Inference', icon:'🤖', color:'#8b5cf6', desc:'Churn / Segment model' },
  { type:'output', label:'Output', icon:'📤', color:'#00ff88', desc:'Dashboard / DB / File' },
]

const statusColors = { idle:'#475569', running:'#ffc400', success:'#00ff88', error:'#ff6b6b' }

function ETLNode({ data }) {
  const def = NODE_TYPES_DEF.find(n => n.type === data.nodeType) || NODE_TYPES_DEF[0]
  return (
    <div style={{
      background:'rgba(10,15,30,0.92)', backdropFilter:'blur(16px)',
      border:`1.5px solid ${data.status==='running' ? '#ffc400' : data.status==='success' ? '#00ff88' : def.color}44`,
      borderRadius:12, padding:'12px 16px', minWidth:150,
      boxShadow: data.status==='running' ? `0 0 20px ${def.color}44` : 'none',
      transition:'all 0.3s'
    }}>
      <Handle type="target" position={Position.Left} style={{ background:def.color, width:10, height:10, border:`2px solid #050818` }}/>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:20 }}>{def.icon}</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{def.label}</div>
          <div style={{ fontSize:11, color:'#475569' }}>{def.desc}</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background: statusColors[data.status||'idle'],
          animation: data.status==='running' ? 'pulse 1s ease infinite' : 'none' }}/>
        <span style={{ fontSize:11, color: statusColors[data.status||'idle'], fontWeight:500, textTransform:'capitalize' }}>
          {data.status||'idle'}
        </span>
      </div>
      <Handle type="source" position={Position.Right} style={{ background:def.color, width:10, height:10, border:`2px solid #050818` }}/>
    </div>
  )
}

const nodeTypes = { etlNode: ETLNode }

const initNodes = [
  { id:'1', type:'etlNode', position:{ x:60, y:160 }, data:{ nodeType:'source', status:'idle' } },
  { id:'2', type:'etlNode', position:{ x:260, y:80 }, data:{ nodeType:'clean', status:'idle' } },
  { id:'3', type:'etlNode', position:{ x:260, y:240 }, data:{ nodeType:'fetch', status:'idle' } },
  { id:'4', type:'etlNode', position:{ x:470, y:160 }, data:{ nodeType:'transform', status:'idle' } },
  { id:'5', type:'etlNode', position:{ x:680, y:100 }, data:{ nodeType:'ml', status:'idle' } },
  { id:'6', type:'etlNode', position:{ x:680, y:240 }, data:{ nodeType:'aggregate', status:'idle' } },
  { id:'7', type:'etlNode', position:{ x:900, y:160 }, data:{ nodeType:'output', status:'idle' } },
]
const initEdges = [
  { id:'e1-2', source:'1', target:'2', animated:false, style:{ stroke:'rgba(0,212,255,0.5)', strokeWidth:2 } },
  { id:'e1-3', source:'1', target:'3', animated:false, style:{ stroke:'rgba(139,92,246,0.5)', strokeWidth:2 } },
  { id:'e2-4', source:'2', target:'4', animated:false, style:{ stroke:'rgba(0,212,255,0.5)', strokeWidth:2 } },
  { id:'e3-4', source:'3', target:'4', animated:false, style:{ stroke:'rgba(139,92,246,0.5)', strokeWidth:2 } },
  { id:'e4-5', source:'4', target:'5', animated:false, style:{ stroke:'rgba(255,196,0,0.5)', strokeWidth:2 } },
  { id:'e4-6', source:'4', target:'6', animated:false, style:{ stroke:'rgba(255,107,107,0.5)', strokeWidth:2 } },
  { id:'e5-7', source:'5', target:'7', animated:false, style:{ stroke:'rgba(0,255,136,0.5)', strokeWidth:2 } },
  { id:'e6-7', source:'6', target:'7', animated:false, style:{ stroke:'rgba(0,255,136,0.5)', strokeWidth:2 } },
]

const execLog = [
  { t:'10:15:01', msg:'Pipeline started', status:'info' },
  { t:'10:15:02', msg:'[source] Loaded 48,291 rows from customers.csv', status:'success' },
  { t:'10:15:03', msg:'[fetch] Fetched 1,204 enrichment records from API', status:'success' },
  { t:'10:15:05', msg:'[clean] Removed 312 duplicates, filled 89 nulls', status:'success' },
  { t:'10:15:08', msg:'[transform] Applied 6 transformation rules', status:'success' },
  { t:'10:15:12', msg:'[ml] Churn inference on 48,291 rows — done', status:'success' },
  { t:'10:15:14', msg:'[aggregate] Grouped by segment, region', status:'success' },
  { t:'10:15:16', msg:'[output] Written to dashboard DB — 48,291 rows', status:'success' },
  { t:'10:15:16', msg:'✅ Pipeline completed in 15.2s', status:'success' },
]

export default function ETLPipeline() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [logs, setLogs] = useState([])

  const onConnect = useCallback(params => setEdges(eds => addEdge({ ...params, animated:true, style:{ stroke:'rgba(0,212,255,0.6)', strokeWidth:2 } }, eds)), [setEdges])

  const runPipeline = () => {
    setRunning(true); setDone(false); setLogs([])
    const order = ['1','2','3','4','5','6','7']
    order.forEach((id, i) => {
      setTimeout(() => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, data:{ ...n.data, status:'running' } } : n))
        setEdges(prev => prev.map(e => e.target === id ? { ...e, animated:true } : e))
        setTimeout(() => {
          setNodes(prev => prev.map(n => n.id === id ? { ...n, data:{ ...n.data, status:'success' } } : n))
          setLogs(prev => [...prev, execLog[i+1] || execLog[execLog.length-1]])
          if (i === order.length - 1) { setRunning(false); setDone(true); setLogs(execLog) }
        }, 1800)
      }, i * 2000)
    })
  }

  const addNode = (type) => {
    const id = `n${Date.now()}`
    setNodes(prev => [...prev, { id, type:'etlNode', position:{ x:200+Math.random()*300, y:100+Math.random()*200 }, data:{ nodeType:type, status:'idle' } }])
  }

  return (
    <div>
      <div className="bg-orb bg-orb-blue" style={{ width:400, height:400, top:-100, right:0, opacity:0.25 }}/>

      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:16 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:700, marginBottom:6 }}><span className="gradient-text">ETL Pipeline</span></h1>
          <p style={{ color:'var(--text-secondary)', fontSize:14 }}>Drag, connect and run your data pipeline</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-primary" onClick={runPipeline} disabled={running}
            style={{ display:'flex', alignItems:'center', gap:8, opacity: running ? 0.8 : 1 }}>
            {running ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }}/> : <Play size={16}/>}
            {running ? 'Running…' : 'Run Pipeline'}
          </button>
          {done && <span className="badge badge-green" style={{ padding:'8px 14px', fontSize:13, borderRadius:10 }}>✓ Completed 15.2s</span>}
        </div>
      </motion.div>

      {/* Node palette */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <span style={{ fontSize:12, color:'var(--text-muted)', alignSelf:'center', marginRight:4 }}>Add node:</span>
        {NODE_TYPES_DEF.map(n => (
          <button key={n.type} onClick={() => addNode(n.type)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8,
              background:`${n.color}12`, border:`1px solid ${n.color}30`, color:n.color,
              cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.2s' }}>
            <Plus size={12}/>{n.icon} {n.label}
          </button>
        ))}
      </motion.div>

      {/* Canvas */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}
        style={{ height:440, borderRadius:16, overflow:'hidden', border:'1px solid rgba(0,212,255,0.12)', marginBottom:20 }}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange} onConnect={onConnect}
          nodeTypes={nodeTypes} fitView
          style={{ background:'#050818' }}>
          <Background color="rgba(0,212,255,0.05)" gap={24} size={1}/>
          <Controls style={{ background:'rgba(10,15,30,0.9)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:8 }}/>
          <MiniMap nodeColor={() => '#00d4ff'} maskColor="rgba(5,8,24,0.8)"
            style={{ background:'rgba(10,15,30,0.9)', border:'1px solid rgba(0,212,255,0.2)' }}/>
        </ReactFlow>
      </motion.div>

      {/* Execution Log */}
      <AnimatePresence>
        {logs.length > 0 && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="glass-card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <Terminal size={16} color="#00d4ff"/>
              <h3 style={{ fontWeight:600 }}>Execution Log</h3>
              {running && <span className="badge badge-yellow" style={{ marginLeft:'auto' }}>RUNNING</span>}
              {done && <span className="badge badge-green" style={{ marginLeft:'auto' }}>DONE</span>}
            </div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, display:'flex', flexDirection:'column', gap:6 }}>
              {logs.map((l,i) => (
                <motion.div key={i} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.05 }}
                  style={{ display:'flex', gap:12, color: l.status==='success' ? '#00ff88' : l.status==='error' ? '#ff6b6b' : '#94a3b8' }}>
                  <span style={{ color:'#475569', minWidth:70 }}>{l.t}</span>
                  <span>{l.msg}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
