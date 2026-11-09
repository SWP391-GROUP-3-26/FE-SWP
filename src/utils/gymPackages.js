// The package API has no variant field. These reserved names identify the two purchasable IDs.
export const GYM_SOLO = 'Gym tự tập'
export const GYM_COACHED = 'Gym có huấn luyện viên 1–1'

export function isGymVariant(name) {
  return name === GYM_SOLO || name === GYM_COACHED
}

export function groupGymPackages(items) {
  const solo = items.find(item => item.name === GYM_SOLO)
  const coached = items.find(item => item.name === GYM_COACHED)
  return items.flatMap(item => {
    if (!isGymVariant(item.name)) return [item]
    if (item !== solo || !coached || solo.durationDays !== coached.durationDays) return []
    return [{ ...solo, name: 'Gym', variants: { solo, coached } }]
  })
}
