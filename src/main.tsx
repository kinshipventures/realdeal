import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ReactFlowProvider } from '@xyflow/react'
import { AuthProvider } from './contexts/AuthContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import './index.css'
import App from './App'

try {
  const savedTheme = localStorage.getItem('realdeal:theme')
  document.documentElement.setAttribute('data-theme', savedTheme === 'dark' ? 'dark' : 'light')
} catch {
  document.documentElement.setAttribute('data-theme', 'light')
}

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
