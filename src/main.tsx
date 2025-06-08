import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './App.css'
import './lib/i18n' // Import i18n configuration

// Get stored language preference or default to 'en'
const savedLanguage = localStorage.getItem('language')
if (savedLanguage) {
  import('i18next').then((i18n) => {
    i18n.default.changeLanguage(savedLanguage)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
