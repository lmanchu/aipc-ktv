import React from 'react'
import ReactDOM from 'react-dom/client'
import DisplayApp from './DisplayApp'

import './index.css'

// Display window entry point
ReactDOM.createRoot(document.getElementById('display-root') as HTMLElement).render(
  <React.StrictMode>
    <DisplayApp />
  </React.StrictMode>
)

postMessage({ payload: 'removeLoading' }, '*')