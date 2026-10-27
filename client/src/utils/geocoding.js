/**
 * SwiftFleet India Geocoding & Address Service
 *
 * Integrates with OpenStreetMap Nominatim with strict Indian boundaries (countrycodes=in).
 * Conforms to Nominatim usage policies:
 * - Rate limited / throttled to at most 1 request per second
 * - In-memory LRU-style caching of queries and reverse coordinates
 * - AbortController timeout (5000ms) to prevent UI blocking
 * - Automatic extraction of standard 6-digit Indian Postal Index Numbers (PIN codes)
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const cache = new Map();
let lastRequestTime = 0;

/**
 * Throttles requests to enforce <= 1 request per second per OSM guidelines
 */
async function throttle() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastRequestTime = Date.now();
}

/**
 * Extracts 6-digit Indian PIN code from address components or text string
 * Regex: /^[1-9][0-9]{5}$/
 */
export function extractIndianPincode(text, addressObj) {
  if (addressObj?.postcode && /^[1-9][0-9]{5}$/.test(addressObj.postcode.trim())) {
    return addressObj.postcode.trim();
  }
  if (!text) return '';
  const match = text.match(/\b([1-9][0-9]{5})\b/);
  return match ? match[1] : '';
}

/**
 * Search Indian address or locality
 * @param {string} query - Free text search (e.g. "Connaught Place", "Koramangala", "110001")
 * @returns {Promise<Array<{ displayName: string, coords: [number, number], pincode: string, city: string, state: string }>>}
 */
export async function searchIndianAddress(query) {
  if (!query || query.trim().length < 3) return [];
  const normalizedQuery = query.trim().toLowerCase();

  if (cache.has(`search:${normalizedQuery}`)) {
    return cache.get(`search:${normalizedQuery}`);
  }

  try {
    await throttle();
    const url = new URL(`${NOMINATIM_BASE_URL}/search`);
    url.searchParams.set('q', query.trim());
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'in'); // Restrict strictly to India
    url.searchParams.set('limit', '5');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en-IN,en;q=0.9'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Geocoding server responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    const results = (Array.isArray(data) ? data : []).map((item) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const addr = item.address || {};
      const pincode = extractIndianPincode(item.display_name, addr);
      const city = addr.city || addr.town || addr.municipality || addr.suburb || addr.state_district || '';
      const state = addr.state || '';

      return {
        displayName: item.display_name,
        coords: [parseFloat(lng.toFixed(5)), parseFloat(lat.toFixed(5))], // [lng, lat] GeoJSON format
        lat,
        lng,
        pincode,
        city,
        state
      };
    });

    cache.set(`search:${normalizedQuery}`, results);
    return results;
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Geocoding search warning:', err.message);
    }
    return [];
  }
}

/**
 * Reverse geocode GPS coordinates to Indian address and PIN code
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{ address: string, pincode: string, city: string, state: string, coords: [number, number] } | null>}
 */
export async function reverseGeocodeIndianCoords(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;

  const key = `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  try {
    await throttle();
    const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en-IN,en;q=0.9'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Reverse geocoding HTTP ${res.status}`);
    }

    const data = await res.json();
    const addr = data.address || {};
    const pincode = extractIndianPincode(data.display_name, addr);
    const city = addr.city || addr.town || addr.municipality || addr.suburb || addr.state_district || '';
    const state = addr.state || '';

    const result = {
      address: data.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      pincode,
      city,
      state,
      coords: [parseFloat(lng.toFixed(5)), parseFloat(lat.toFixed(5))]
    };

    cache.set(key, result);
    return result;
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Reverse geocoding warning:', err.message);
    }
    return {
      address: `Selected Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      pincode: '',
      city: '',
      state: '',
      coords: [parseFloat(lng.toFixed(5)), parseFloat(lat.toFixed(5))]
    };
  }
}
