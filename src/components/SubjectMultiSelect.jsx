import { useEffect, useId, useRef, useState } from 'react'
import './SubjectMultiSelect.css'

export default function SubjectMultiSelect({ options, value = [], onChange, label = 'Chọn môn học' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const listId = useId()
  const selected = options.filter((option) => value.includes(option.id))
  const visibleOptions = options.filter((option) =>
    option.name.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    searchRef.current?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function toggle(id) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id])
  }

  const summary = selected.length
    ? `${selected.slice(0, 2).map(({ name }) => name).join(', ')}${selected.length > 2 ? ` +${selected.length - 2}` : ''}`
    : label

  return (
    <div className={`subject-multi-select${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        className="subject-multi-select-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected.length ? 'has-selection' : ''}>{summary}</span>
        {selected.length > 0 && <small>{selected.length} đã chọn</small>}
        <span className="subject-multi-select-chevron" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="subject-multi-select-menu" id={listId}>
          <div className="subject-multi-select-tools">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm môn học..."
              aria-label="Tìm môn học"
            />
            {selected.length > 0 && (
              <button type="button" onClick={() => onChange([])}>Bỏ chọn</button>
            )}
          </div>
          <div className="subject-multi-select-options" role="group" aria-label={label}>
            {visibleOptions.map((option) => {
              const checked = value.includes(option.id)
              return (
                <label className={checked ? 'is-selected' : ''} key={option.id}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(option.id)} />
                  <span>{option.name}</span>
                  {checked && <span className="subject-multi-select-check" aria-hidden="true">✓</span>}
                </label>
              )
            })}
            {!visibleOptions.length && <p className="subject-multi-select-empty">Không tìm thấy môn học phù hợp.</p>}
          </div>
          <p className="subject-multi-select-footer">Chọn một hoặc nhiều môn học</p>
        </div>
      )}
    </div>
  )
}
