import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import defaultData from '../data/defaultData.js'

const PortfolioContext = createContext(null)

const STORAGE_KEY = 'portfolio_data'
const ADMIN_TOKEN_KEY = 'admin_auth_token'
const DATA_VERSION = defaultData._version

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && parsed._version === DATA_VERSION) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Failed to load saved data:', e)
  }
  return null
}

export function PortfolioProvider({ children }) {
  const [data, setData] = useState(() => loadFromStorage() || defaultData)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(ADMIN_TOKEN_KEY) === 'admin_token_2026'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const updateData = useCallback((key, value) => {
    setData(prev => {
      const next = { ...prev, [key]: value }
      return next
    })
  }, [])

  const updateSection = useCallback((section, updates) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }))
  }, [])

  const updateArrayItem = useCallback((section, index, updates) => {
    setData(prev => {
      const arr = [...prev[section]]
      arr[index] = { ...arr[index], ...updates }
      return { ...prev, [section]: arr }
    })
  }, [])

  const addArrayItem = useCallback((section, item) => {
    setData(prev => ({
      ...prev,
      [section]: [...prev[section], item]
    }))
  }, [])

  const removeArrayItem = useCallback((section, index) => {
    setData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }))
  }, [])

  const login = useCallback((password) => {
    if (password === 'admin2026') {
      localStorage.setItem(ADMIN_TOKEN_KEY, 'admin_token_2026')
      setIsAuthenticated(true)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    setIsAuthenticated(false)
  }, [])

  const resetData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setData(defaultData)
  }, [])

  const importData = useCallback((newData) => {
    try {
      // keep version from imported data, but ensure it has required keys
      setData(newData)
    } catch (e) {
      console.error('import failed', e)
    }
  }, [])

  return (
    <PortfolioContext.Provider value={{
      data,
      setData,
      isAuthenticated,
      login,
      logout,
      updateData,
      updateSection,
      updateArrayItem,
      addArrayItem,
      removeArrayItem,
      resetData,
      importData,
    }}>
      {children}
    </PortfolioContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider')
  return ctx
}

export default PortfolioContext