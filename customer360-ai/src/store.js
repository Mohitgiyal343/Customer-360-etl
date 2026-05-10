import { create } from 'zustand'

// Global app state store
export const useAppStore = create((set, get) => ({
  // Uploaded dataset
  uploadedFile: null,
  datasetRows: 0,
  datasetColumns: 0,
  setUploadedFile: (file, rows, cols) => set({ uploadedFile: file, datasetRows: rows, datasetColumns: cols }),

  // Cleaning state
  cleaned: false,
  cleaningScore: 62,
  setCleaned: (score) => set({ cleaned: true, cleaningScore: score }),

  // Pipeline state
  pipelineRun: null,
  setPipelineRun: (run) => set({ pipelineRun: run }),

  // Deployed models
  deployedModels: [],
  deployModel: (modelId, metrics) => set(s => ({
    deployedModels: [...s.deployedModels.filter(m => m.id !== modelId), { id: modelId, metrics, deployedAt: new Date() }]
  })),

  // Notifications
  notifications: [],
  addNotification: (msg, type = 'info') => {
    const id = Date.now()
    set(s => ({ notifications: [...s.notifications, { id, msg, type }] }))
    setTimeout(() => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })), 4000)
  },
}))
