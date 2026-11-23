import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App'
import { CinemaCursor } from './components/CinemaCursor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
      <CinemaCursor />
    </MotionConfig>
  </StrictMode>,
)
