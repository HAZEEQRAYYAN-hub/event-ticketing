// Remembers who is logged in, for the whole website.
// Any page can call useAuth() to get the user, or to log in and out.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { SESSION_KEY, readSavedSession } from '../api/client'
import { loginRequest, registerRequest } from '../api/auth'

const AuthContext = createContext(null)

// The token holds its expiry time inside it. This reads it.
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

// Load the saved session when the website opens, ignoring expired ones
function loadSession() {
  const saved = readSavedSession()
  if (!saved?.token || isTokenExpired(saved.token)) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  return saved
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession)
  const [sessionExpired, setSessionExpired] = useState(false)
  // true after the user clicks Log out, so logged-in-only pages send them
  // home instead of to the Log in page
  const [loggedOutOnPurpose, setLoggedOutOnPurpose] = useState(false)

  // Save to the browser and to React at the same time
  const saveSession = useCallback((newSession) => {
    if (newSession) localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
    else localStorage.removeItem(SESSION_KEY)
    setSession(newSession)
  }, [])

  // client.js sends this signal when the backend says the token is no longer valid
  useEffect(() => {
    function handleExpired() {
      saveSession(null)
      setSessionExpired(true)
    }
    window.addEventListener('tixora:session-expired', handleExpired)
    return () => window.removeEventListener('tixora:session-expired', handleExpired)
  }, [saveSession])

  async function login(email, password) {
    const data = await loginRequest(email, password)
    saveSession({ token: data.token, user: data.user })
    setSessionExpired(false)
    setLoggedOutOnPurpose(false)
    return data.user
  }

  // Create the account, then log straight in
  async function register(name, email, password) {
    await registerRequest(name, email, password)
    return login(email, password)
  }

  function logout() {
    saveSession(null)
    setLoggedOutOnPurpose(true)
  }

  // After the name is changed on the Profile page
  function updateUser(changes) {
    saveSession({ ...session, user: { ...session.user, ...changes } })
  }

  const value = {
    user: session?.user || null,
    isLoggedIn: Boolean(session),
    isCustomer: session?.user?.role === 'customer',
    isAdmin: session?.user?.role === 'admin',
    sessionExpired,
    loggedOutOnPurpose,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
