const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const isFiniteCoordinate = (value) => Number.isFinite(Number(value));

const encodeGeohash = (latitude, longitude, precision = 9) => {
  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) return null;

  let latRange = [-90, 90];
  let lonRange = [-180, 180];
  let hash = '';
  let bits = 0;
  let bitsTotal = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (Number(longitude) >= mid) {
        bits = (bits << 1) + 1;
        lonRange[0] = mid;
      } else {
        bits <<= 1;
        lonRange[1] = mid;
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (Number(latitude) >= mid) {
        bits = (bits << 1) + 1;
        latRange[0] = mid;
      } else {
        bits <<= 1;
        latRange[1] = mid;
      }
    }

    even = !even;
    bitsTotal++;

    if (bitsTotal === 5) {
      hash += BASE32[bits];
      bits = 0;
      bitsTotal = 0;
    }
  }

  return hash;
};

const getBitsByPrecision = (precision) => {
  const totalBits = precision * 5;
  return {
    lonBits: Math.ceil(totalBits / 2),
    latBits: Math.floor(totalBits / 2),
  };
};

const getCellSizeDegrees = (precision) => {
  const { lonBits, latBits } = getBitsByPrecision(precision);
  return {
    lat: 180 / Math.pow(2, latBits),
    lon: 360 / Math.pow(2, lonBits),
  };
};

const getPrecisionForRadiusKm = (radiusKm) => {
  if (radiusKm <= 1) return 6;
  if (radiusKm <= 5) return 5;
  if (radiusKm <= 25) return 4;
  if (radiusKm <= 150) return 3;
  return 2;
};

const getGeohashPrefixesForRadius = ({ latitude, longitude, radiusKm }) => {
  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) return [];

  const safeRadiusKm = Math.max(1, Number(radiusKm) || 1);
  const precision = getPrecisionForRadiusKm(safeRadiusKm);
  const cellSize = getCellSizeDegrees(precision);
  const latDelta = safeRadiusKm / 110.574;
  const lonScale = Math.max(0.1, Math.cos(Number(latitude) * Math.PI / 180));
  const lonDelta = safeRadiusKm / (111.320 * lonScale);
  const minLat = Math.max(-90, Number(latitude) - latDelta);
  const maxLat = Math.min(90, Number(latitude) + latDelta);
  const minLon = Math.max(-180, Number(longitude) - lonDelta);
  const maxLon = Math.min(180, Number(longitude) + lonDelta);
  const latStep = Math.max(cellSize.lat / 2, 0.0001);
  const lonStep = Math.max(cellSize.lon / 2, 0.0001);
  const prefixes = new Set();

  for (let lat = minLat; lat <= maxLat + latStep; lat += latStep) {
    for (let lon = minLon; lon <= maxLon + lonStep; lon += lonStep) {
      const clampedLat = Math.min(maxLat, lat);
      const clampedLon = Math.min(maxLon, lon);
      prefixes.add(encodeGeohash(clampedLat, clampedLon, precision));
    }
  }

  prefixes.add(encodeGeohash(latitude, longitude, precision));
  return [...prefixes].filter(Boolean).sort();
};

const getGeohashRangeForPrefix = (prefix) => [prefix, `${prefix}~`];

const buildProfileGeohashUpdate = (latitude, longitude) => {
  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
    return { geohash: null };
  }

  return {
    geohash: encodeGeohash(latitude, longitude),
    geohash_updated_at: new Date().toISOString(),
  };
};

module.exports = {
  encodeGeohash,
  getGeohashPrefixesForRadius,
  getGeohashRangeForPrefix,
  buildProfileGeohashUpdate,
};
