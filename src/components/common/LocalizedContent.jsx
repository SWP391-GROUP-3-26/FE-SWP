import { cloneElement, Fragment, isValidElement, useEffect, useState } from 'react'
import { getLanguage, subscribeLanguage, translateText } from '../../utils/language'

function localizeNode(node) {
  if (typeof node === 'string') return translateText(node)
  if (typeof node === 'number' || node == null || typeof node === 'boolean') return node
  if (Array.isArray(node)) return node.map((child) => localizeNode(child))
  if (!isValidElement(node)) return node

  const localizedProps = {}
  for (const key of ['aria-label', 'placeholder', 'title']) {
    if (typeof node.props[key] === 'string') localizedProps[key] = translateText(node.props[key])
  }
  return cloneElement(node, {
    ...localizedProps,
    children: localizeNode(node.props.children),
  })
}

export default function LocalizedContent({ children }) {
  const [, setLanguage] = useState(getLanguage)
  useEffect(() => subscribeLanguage((event) => {
    setLanguage(event?.detail || getLanguage())
  }), [])

  return localizeNode(children)
}
