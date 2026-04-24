import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ReactFlowProvider } from '@xyflow/react'
import { AuthProvider } from './contexts/AuthContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import './index.css'
import App from './App'
import { setDemoMode } from './lib/sampleData'

// Force light mode site-wide. Overrides system preference.
document.documentElement.setAttribute('data-theme', 'light')

// URL-activated demo mode: ?demo=on enables, ?demo=off disables.
// Lets anyone open a Vercel preview link and see the app with sample data.
{
  const params = new URLSearchParams(window.location.search)
  const demo = params.get('demo')
  if (demo === 'on') setDemoMode(true)
  else if (demo === 'off') setDemoMode(false)
  if (demo !== null) {
    params.delete('demo')
    const qs = params.toString()
    const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
    window.history.replaceState({}, '', url)
  }
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
