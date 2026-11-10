// Frontend options; category is a string in the backend contract, not an enum.
export const SUBJECT_CATEGORIES = ['Fitness', 'Thể thao trên cạn', 'Thể thao dưới nước']

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
