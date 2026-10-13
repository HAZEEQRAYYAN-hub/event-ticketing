// The starting point of the website.
// It finds <div id="root"> in index.html and draws the App inside it.
//
// BrowserRouter  lets us have many pages (/, /events, /login ...)
// AuthProvider   remembers who is logged in, for every page
//
// Note: React's <StrictMode> is left out on purpose. In development it runs
// every request twice, and the backend only allows 100 requests per 15 minutes.

import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
)
