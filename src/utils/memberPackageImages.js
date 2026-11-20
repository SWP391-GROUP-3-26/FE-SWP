import fitnessImage from '../assets/member-package-basic.jpg'
import sportsImage from '../assets/member-package-standard.jpg'
import comprehensiveTwelveMonthImage from '../assets/member-package-comprehensive-12-month.jpg'
import comprehensiveSixMonthImage from '../assets/member-package-comprehensive-6-month.jpg'
import martialArtsImage from '../assets/member-package-martial-arts-3-month.jpg'
import fallbackImage from '../assets/center-manager-dashboard.jpg'

// Chọn ảnh minh họa theo loại gói và thời hạn, không dùng chung ảnh theo số tháng.
export function memberPackageImage(name, durationMonthsOrDays) {
  const packageName = String(name || '').toLocaleLowerCase('vi')
  const duration = Number(durationMonthsOrDays)

  if (/võ thuật|martial/.test(packageName)) return martialArtsImage
  if (/toàn diện|comprehensive/.test(packageName)) {
    if (duration === 6 || duration === 180 || /6\s*tháng/.test(packageName)) return comprehensiveSixMonthImage
    if (duration === 12 || [360, 365, 366].includes(duration) || /12\s*tháng/.test(packageName)) return comprehensiveTwelveMonthImage
  }
  if (/thể thao|sport/.test(packageName)) return sportsImage
  if (/fitness|basic/.test(packageName)) return fitnessImage
  return fallbackImage
}
