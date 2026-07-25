const toRadians = (value) => (value * Math.PI) / 180;

const ABIDJAN_COMMUNES = [
  'abobo', 'adjame', 'attecoube', 'cocody', 'koumassi',
  'marcory', 'plateau', 'port-bouet', 'treichville',
  'yopougon', 'anyama', 'bingerville', 'songon'
];

/**
 * Unifies city names, especially for Abidjan communes
 */
const normalizeCity = (city) => {
  if (!city) return '';
  const clean = city.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, '-'); // Replace spaces with dashes

  if (ABIDJAN_COMMUNES.includes(clean) || clean === 'abidjan') {
    return 'abidjan';
  }
  return clean;
};

module.exports = { toRadians, normalizeCity };
