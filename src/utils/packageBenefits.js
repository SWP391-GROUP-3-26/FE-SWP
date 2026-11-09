const GROUP_CLASS_LIMIT = /\b\d+\s*(?:buổi|buoi)\s*(?:lớp\s*nhóm|lop\s*nhom)\b/gi

export function normalizePackageBenefits(benefits) {
  if (typeof benefits !== 'string' || !benefits.trim()) return benefits ?? ''
  return benefits.replace(GROUP_CLASS_LIMIT, 'Không giới hạn số buổi lớp nhóm')
}
