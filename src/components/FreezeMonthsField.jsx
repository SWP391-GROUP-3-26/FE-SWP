export default function FreezeMonthsField({ name = 'freezeMonths', label = 'Số tháng được bảo lưu', ...inputProps }) {
  return <label>{label}
    <span className="input-wrap">
      <input type="number" name={name} min="0" step="1" required {...inputProps} />
    </span>
    <small>Nhập 0 nếu gói không cho phép bảo lưu.</small>
  </label>
}
