import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SessionExpiredToast } from './components/SessionExpiredToast.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <SessionExpiredToast />
  </StrictMode>,
)
