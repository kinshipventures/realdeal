import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ReactFlowProvider } from '@xyflow/react'
import './styles/globals.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactFlowProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ReactFlowProvider>
  </StrictMode>,
)
