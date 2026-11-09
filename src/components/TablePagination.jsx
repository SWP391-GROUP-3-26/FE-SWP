import './TablePagination.css'
import LocalizedContent from './LocalizedContent'

export default function TablePagination({ page, pageSize = 10, totalItems, onPageChange, loading = false, itemLabel = 'mục' }) {
  if (!totalItems) return null

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1)
  const firstItem = currentPage * pageSize + 1
  const lastItem = Math.min((currentPage + 1) * pageSize, totalItems)

  return (
    <LocalizedContent><footer className="table-pagination">
      <span>Hiển thị {firstItem}–{lastItem} trong {totalItems} {itemLabel}</span>
      <nav aria-label="Phân trang bảng">
        <button type="button" disabled={loading || currentPage === 0} onClick={() => onPageChange(currentPage - 1)}>Trang trước</button>
        <span aria-live="polite">Trang {currentPage + 1} / {totalPages}</span>
        <button type="button" disabled={loading || currentPage + 1 >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Trang sau</button>
      </nav>
    </footer></LocalizedContent>
  )
}
