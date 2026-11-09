const preferenceKey = 'unisports.language'

export function getLanguage() {
  try {
    return localStorage.getItem(preferenceKey) === 'en' ? 'en' : 'vi'
  } catch {
    return 'vi'
  }
}

export function saveLanguage(language) {
  localStorage.setItem(preferenceKey, language)
}
