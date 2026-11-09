import { useEffect, useRef } from 'react'
import { getEnglishSource, translateText, useLanguage } from '../utils/language'

const LOCALIZED_ATTRIBUTES = ['aria-label', 'aria-description', 'alt', 'placeholder', 'title']
const SKIP_SELECTOR = 'script, style, noscript, textarea, code, pre, [data-no-translate]'

function shouldSkipText(node) {
  const parent = node.parentElement
  return !parent || parent.isContentEditable || Boolean(parent.closest(SKIP_SELECTOR))
}

function createDocumentLocalizer(languageRef) {
  if (typeof document === 'undefined' || !document.body) return () => {}

  // Keep source text for the lifetime of the app so EN ↔ VI toggles do not
  // accidentally treat a translated string as the original.
  const textRecords = new WeakMap()
  const attributeRecords = new WeakMap()
  const touchedText = new Set()
  const touchedElements = new Set()

  const sourceFor = (value) => languageRef.current === 'en' ? getEnglishSource(value) : value

  function applyText(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || shouldSkipText(node)) return
    const current = node.data
    let record = textRecords.get(node)
    if (!record) {
      record = { source: sourceFor(current), rendered: null }
      textRecords.set(node, record)
    } else if (current !== record.rendered) {
      // React may replace text after a state/API update. Capture the newly
      // rendered source before localizing it again.
      record.source = sourceFor(current)
    }
    const next = languageRef.current === 'en' ? translateText(record.source) : record.source
    record.rendered = next
    if (next !== current) node.data = next
    touchedText.add(node)
  }

  function applyAttributes(element) {
    if (!(element instanceof Element)) return
    let records = attributeRecords.get(element)
    if (!records) {
      records = new Map()
      attributeRecords.set(element, records)
    }
    for (const name of LOCALIZED_ATTRIBUTES) {
      if (!element.hasAttribute(name)) continue
      const current = element.getAttribute(name) || ''
      let record = records.get(name)
      if (!record) {
        record = { source: sourceFor(current), rendered: null }
        records.set(name, record)
      } else if (current !== record.rendered) {
        record.source = sourceFor(current)
      }
      const next = languageRef.current === 'en' ? translateText(record.source) : record.source
      record.rendered = next
      if (next !== current) element.setAttribute(name, next)
    }
    touchedElements.add(element)
  }

  function scan(root) {
    if (!root) return
    if (root.nodeType === Node.TEXT_NODE) {
      applyText(root)
      return
    }
    if (root.nodeType === Node.ELEMENT_NODE) applyAttributes(root)
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) applyText(node)
    if (root.querySelectorAll) root.querySelectorAll('*').forEach(applyAttributes)
  }

  function refresh() {
    document.documentElement.lang = languageRef.current
    for (const node of touchedText) {
      if (node.isConnected) applyText(node)
      else touchedText.delete(node)
    }
    for (const element of touchedElements) {
      if (element.isConnected) applyAttributes(element)
      else touchedElements.delete(element)
    }
    scan(document.body)
  }

  scan(document.body)
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') applyText(record.target)
      else if (record.type === 'attributes') applyAttributes(record.target)
      else record.addedNodes.forEach(scan)
    }
  })
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: LOCALIZED_ATTRIBUTES,
    characterData: true,
    childList: true,
    subtree: true,
  })

  return () => observer.disconnect()
}

export default function LocalizationBridge() {
  const language = useLanguage()
  const languageRef = useRef(language)
  const refreshRef = useRef(null)
  languageRef.current = language

  useEffect(() => {
    refreshRef.current = createDocumentLocalizer(languageRef)
    return () => refreshRef.current?.()
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    // The observer owns persistent source maps; a short scan applies the
    // selected language to all role pages and lazily mounted components.
    refreshRef.current?.()
  }, [language])

  return null
}
