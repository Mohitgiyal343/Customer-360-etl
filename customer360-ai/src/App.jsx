import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import UploadData from './pages/UploadData'
import DataCleaning from './pages/DataCleaning'
import ETLPipeline from './pages/ETLPipeline'
import Analytics from './pages/Analytics'
import MachineLearning from './pages/MachineLearning'
import Reports from './pages/Reports'
import APIConnect from './pages/APIConnect'
import AIInsights from './pages/AIInsights'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="upload"      element={<UploadData />} />
          <Route path="api-connect" element={<APIConnect />} />
          <Route path="cleaning"    element={<DataCleaning />} />
          <Route path="etl"         element={<ETLPipeline />} />
          <Route path="analytics"   element={<Analytics />} />
          <Route path="insights"    element={<AIInsights />} />
          <Route path="ml"          element={<MachineLearning />} />
          <Route path="reports"     element={<Reports />} />
          <Route path="settings"    element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
