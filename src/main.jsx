import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FlatKitchen from '../flat-kitchen.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FlatKitchen />
  </StrictMode>,
)
