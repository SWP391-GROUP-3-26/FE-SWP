import { useEffect, useRef, useState } from 'react'
import { getLanguage, saveLanguage } from '../utils/language'
import './LanguageSwitcher.css'

const OPTIONS = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
]

export default function LanguageSwitcher() {
  const [language, setLanguage] = useState(getLanguage)
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    const syncLanguage = (event) => setLanguage(event.detail || getLanguage())
    const syncStorage = () => setLanguage(getLanguage())
    window.addEventListener('unisports:language-changed', syncLanguage)
    window.addEventListener('storage', syncStorage)
    document.documentElement.lang = getLanguage()
    return () => {
      window.removeEventListener('unisports:language-changed', syncLanguage)
      window.removeEventListener('storage', syncStorage)
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const currentOption = OPTIONS.find((option) => option.code === language) || OPTIONS[0]

  return (
    <div className="language-switcher" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={language === 'en' ? 'Change language' : 'Đổi ngôn ngữ'}
        className="language-switcher-trigger"
        onClick={() => setOpen((value) => !value)}
        title={language === 'en' ? 'Language' : 'Ngôn ngữ'}
        type="button"
      >
        <span className="material-symbols-outlined" aria-hidden="true">language</span>
        <span>{currentOption.code.toUpperCase()}</span>
        <span className="material-symbols-outlined language-switcher-chevron" aria-hidden="true">expand_more</span>
      </button>
      {open && (
        <div className="language-switcher-menu" role="menu" aria-label={language === 'en' ? 'Choose language' : 'Chọn ngôn ngữ'}>
          {OPTIONS.map((option) => (
            <button
              aria-checked={language === option.code}
              className={language === option.code ? 'is-selected' : ''}
              key={option.code}
              onClick={() => {
                saveLanguage(option.code)
                setLanguage(option.code)
                setOpen(false)
              }}
              role="menuitemradio"
              type="button"
            >
              <span>{option.label}</span>
              {language === option.code && <span className="material-symbols-outlined" aria-hidden="true">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
