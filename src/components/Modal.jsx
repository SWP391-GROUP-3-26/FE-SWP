import { useEffect, useRef } from 'react'

export default function Modal({ title, busy = false, onClose, className = '', children }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      previousFocus?.focus()
    }
  }, [])

  return (
    <dialog className={`serene-modal ${className}`.trim()} ref={dialogRef} aria-labelledby="modal-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
      <div className="panel-heading">
        <h3 id="modal-title">{title}</h3>
        <button className="icon-button" type="button" aria-label="Đóng" disabled={busy} onClick={onClose}>
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
      {children}
    </dialog>
  )
}
