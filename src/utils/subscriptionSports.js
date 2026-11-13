function key(memberId, subscriptionId) {
  return 'unisports:subscription-sports:' + JSON.stringify([String(memberId), String(subscriptionId)])
}

function purchaseSports(pkg, choices) {
  return {
    included: (pkg.includedSports || []).map(s => s.name),
    selected: (pkg.choiceGroups || []).flatMap(group => {
      const ids = choices.find(c => c.choiceGroupId === group.id)?.sportIds || []
      return group.sports.filter(s => ids.includes(s.id)).map(s => s.name)
    }),
  }
}

export function rememberSports(memberId, subscriptionId, pkg, choices) {
  if (!memberId || memberId === 'anonymous' || !subscriptionId) return
  try {
    localStorage.setItem(key(memberId, subscriptionId), JSON.stringify(purchaseSports(pkg, choices)))
  } catch { /* Browser storage is optional for checkout. */ }
}

export function readSports(memberId, subscriptionId) {
  try {
    const value = JSON.parse(localStorage.getItem(key(memberId, subscriptionId)))
    return [value?.included, value?.selected].every(list =>
      Array.isArray(list) && list.every(name => typeof name === 'string')) ? value : null
  } catch { return null }
}
