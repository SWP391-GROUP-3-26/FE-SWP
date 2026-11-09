function validSport(sport) {
  return Number.isInteger(sport?.id) && sport.id > 0
}

export function hasPackageSportConfiguration(pkg) {
  return Array.isArray(pkg.includedSports) && pkg.includedSports.every(validSport)
    && Array.isArray(pkg.choiceGroups) && pkg.choiceGroups.every((group) =>
      typeof group?.name === 'string' && Number.isInteger(group.requiredSelection)
      && group.requiredSelection > 0 && Array.isArray(group.sports) && group.sports.every(validSport))
}

export function toPackageEditForm(pkg) {
  const hasSports = hasPackageSportConfiguration(pkg)
  return {
    name: pkg.name ?? '',
    description: pkg.description ?? '',
    durationMonths: pkg.durationMonths ?? 1,
    freezeMonths: pkg.freezeMonths ?? 0,
    price: pkg.price != null ? String(pkg.price) : '',
    status: pkg.status ?? 'Active',
    benefits: normalizePackageBenefits(pkg.benefits),
    discount: pkg.discount ?? 0,
    termConditions: pkg.termConditions ?? '',
    includedSportIds: hasSports ? pkg.includedSports.map((sport) => sport.id) : [],
    choiceGroups: hasSports ? pkg.choiceGroups.map((group, index) => ({
      groupName: group.name,
      description: group.description ?? '',
      requiredSelection: group.requiredSelection,
      sortOrder: group.sortOrder ?? index,
      sportIds: group.sports.map((sport) => sport.id),
    })) : [],
  }
}
import { normalizePackageBenefits } from './packageBenefits'
