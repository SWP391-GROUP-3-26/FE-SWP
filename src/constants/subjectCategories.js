// Frontend fallback options; category is a string in the backend contract, not an enum.
export const SUBJECT_CATEGORIES = ['Fitness', 'Thể thao trên cạn', 'Thể thao dưới nước']

export const ALL_VENUES = [
  ['GYM', 'Phòng Gym'],
  ['PILATES', 'Phòng Pilates'],
  ['FUNCTIONAL', 'Phòng Functional'],
  ['BOXING', 'Phòng Boxing'],
  ['MARTIAL_ARTS', 'Phòng võ'],
  ['MULTIPURPOSE', 'Phòng đa năng / studio'],
  ['SWIMMING_POOL', 'Bể bơi'],
  ['BADMINTON_COURT', 'Sân cầu lông'],
  ['FOOTBALL_COURT', 'Sân bóng đá'],
  ['BASKETBALL_COURT', 'Sân bóng rổ'],
  ['TABLE_TENNIS_COURT', 'Sân bóng bàn'],
  ['TENNIS_COURT', 'Sân tennis'],
]

export const VENUES_BY_CATEGORY = {
  Fitness: [
    ['MULTIPURPOSE', 'Phòng đa năng / studio'], ['FUNCTIONAL', 'Phòng Functional'],
    ['PILATES', 'Phòng Pilates'], ['BOXING', 'Phòng Boxing'],
    ['MARTIAL_ARTS', 'Phòng võ'],
  ],
  'Thể thao trên cạn': [
    ['BADMINTON_COURT', 'Sân cầu lông'], ['FOOTBALL_COURT', 'Sân bóng đá'],
    ['BASKETBALL_COURT', 'Sân bóng rổ'], ['TABLE_TENNIS_COURT', 'Sân bóng bàn'],
    ['TENNIS_COURT', 'Sân tennis'], ['MULTIPURPOSE', 'Phòng đa năng'],
    ['GYM', 'Phòng Gym'],
  ],
  'Thể thao dưới nước': [['SWIMMING_POOL', 'Bể bơi']],
}

export function getVenuesForCategory(category) {
  if (!category) return []
  return VENUES_BY_CATEGORY[category] || ALL_VENUES
}
