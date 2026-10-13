import { createContext, useContext, useState, useEffect } from 'react'
import { darkColors, lightColors, applyColorTheme } from '../styles/colors'
import {
  getAccessibilitySettings,
  saveAccessibilitySettings,
  onAccessibilityChange,
} from '../shared/accessibility/accessibilitySettings'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(() => getAccessibilitySettings())

  useEffect(() => {
    return onAccessibilityChange(() => {
      setSettings(getAccessibilitySettings())
    })
  }, [])

  const toggleDarkMode = async (value) => {
    const a11y = getAccessibilitySettings()
    await saveAccessibilitySettings({ ...a11y, darkMode: value })
  }

  const darkMode = settings.darkMode
  const colorTheme = settings.colorTheme
  const currentColors = applyColorTheme(darkMode ? darkColors : lightColors, colorTheme)

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, currentColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
