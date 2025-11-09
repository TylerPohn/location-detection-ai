import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize MSW (Mock Service Worker) in demo mode
async function enableMocking() {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const { worker } = await import('./demo/mocks/browser')

    return worker.start({
      onUnhandledRequest: 'bypass',
      quiet: false,
    })
  }

  return Promise.resolve()
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
