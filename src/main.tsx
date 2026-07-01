import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ReactFlowProvider } from '@xyflow/react'
import { AuthProvider } from './contexts/AuthContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { isChunkLoadError, reloadOnceForChunkLoadError } from './lib/chunkLoadRecovery'
import './index.css'
import App from './App'

function registerChunkLoadRecovery() {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadOnceForChunkLoadError()
  })

  window.addEventListener('error', (event) => {
    if (!isChunkLoadError(event.error ?? event.message)) return
    event.preventDefault()
    reloadOnceForChunkLoadError()
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return
    event.preventDefault()
    reloadOnceForChunkLoadError()
  })
}

try {
  const savedTheme = localStorage.getItem('realdeal:theme')
  document.documentElement.setAttribute('data-theme', savedTheme === 'dark' ? 'dark' : 'light')
} catch {
  document.documentElement.setAttribute('data-theme', 'light')
}

registerChunkLoadRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactFlowProvider>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <App />
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ReactFlowProvider>
  </StrictMode>,
)
