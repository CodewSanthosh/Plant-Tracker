const express = require('express');
const axios = require('axios');
const router = express.Router();
const { protect } = require('../middleware/auth');

// @desc    Reverse geocode lat/lng to a full address
// @route   GET /api/geocode/reverse?lat=XX&lon=XX
// @access  Private (logged-in users)
router.get('/reverse', protect, async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ message: 'lat and lon query params are required' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ message: 'Invalid lat/lon values' });
  }

  let result = {
    display_name: '',
    short_title: '',
    full_address: '',   // NEW — single-line detailed address like GPS Map Camera
    street: '',
    house_number: '',
    building: '',       // university, campus, amenity, building name
    area: '',
    city: '',
    district: '',
    state: '',
    country: '',
    pincode: '',
    source: 'none',
  };

  // Helper: build a full address string like "1, 1st Cross Rd, Anna University, Kotturpuram, Chennai, Tamil Nadu 600025, India"
  const buildFullAddress = (r) => {
    const parts = [];

    // House number + street  (e.g. "1, 1st Cross Rd")
    const streetPart = [r.house_number, r.street].filter(Boolean).join(', ');
    if (streetPart) parts.push(streetPart);

    // Building / campus / amenity name
    if (r.building) parts.push(r.building);

    // Area / neighbourhood / suburb
    if (r.area) parts.push(r.area);

    // City
    if (r.city) parts.push(r.city);

    // State + Pincode  (e.g. "Tamil Nadu 600025")
    if (r.state) {
      parts.push(r.pincode ? `${r.state} ${r.pincode}` : r.state);
    } else if (r.pincode) {
      parts.push(r.pincode);
    }

    // Country
    if (r.country) parts.push(r.country);

    // De-duplicate adjacent identical tokens (e.g. city == area)
    const deduped = parts.filter((p, i) => i === 0 || p.toLowerCase() !== parts[i - 1].toLowerCase());
    return deduped.join(', ');
  };

  // ── Attempt 1: OpenStreetMap Nominatim ──
  try {
    const nominatimRes = await axios.get(
      'https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
          'accept-language': 'en',
          zoom: 18,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'PlantTrackerApp/1.0 (santhosh@planttracker.app)',
        },
        timeout: 8000,
      }
    );

    const data = nominatimRes.data;
    if (data && !data.error && data.display_name) {
      const addr = data.address || {};

      result.display_name = data.display_name;

      // Extract house number
      result.house_number = addr.house_number || '';

      // Extract street/road
      result.street = addr.road || addr.pedestrian || addr.footway || addr.path || '';

      // Extract building / campus / landmark name
      // Nominatim puts the primary feature in various keys depending on type
      result.building = addr.building || addr.amenity || addr.university || addr.college
                     || addr.school || addr.office || addr.shop || addr.tourism
                     || addr.leisure || addr.historic || addr.place_of_worship || '';

      // Area / neighbourhood
      result.area = addr.neighbourhood || addr.suburb || addr.hamlet || addr.quarter || '';

      // City
      result.city = addr.city || addr.town || addr.village || addr.municipality || '';

      // District
      result.district = addr.county || addr.state_district || '';

      // State, country, pincode
      result.state = addr.state || '';
      result.country = addr.country || '';
      result.pincode = addr.postcode || '';
      result.source = 'nominatim';

      // Build a better short_title  (e.g. "Chennai, Tamil Nadu, India")
      result.short_title = [result.city, result.state, result.country].filter(Boolean).join(', ') || 'Location';

      // Build the detailed full_address
      result.full_address = buildFullAddress(result);

      return res.json(result);
    }
  } catch (err) {
    console.warn('Nominatim geocoding failed:', err.message);
  }

  // ── Attempt 2: BigDataCloud (no API key needed for basic) ──
  try {
    const bdcRes = await axios.get(
      'https://api.bigdatacloud.net/data/reverse-geocode-client', {
        params: {
          latitude,
          longitude,
          localityLanguage: 'en',
        },
        timeout: 8000,
      }
    );

    const data = bdcRes.data;
    if (data) {
      result.city = data.city || data.locality || '';
      result.area = data.localityInfo?.administrative?.[0]?.name || '';
      result.district = data.localityInfo?.administrative?.[1]?.name || '';
      result.state = data.principalSubdivision || '';
      result.country = data.countryName || '';
      result.pincode = data.postcode || '';
      result.source = 'bigdatacloud';

      const parts = [data.locality, data.city, data.principalSubdivision, data.countryName].filter(Boolean);
      result.display_name = [...new Set(parts)].join(', ');
      result.short_title = [result.city || result.area, result.state, result.country].filter(Boolean).join(', ') || 'Location';
      result.full_address = buildFullAddress(result);

      return res.json(result);
    }
  } catch (err) {
    console.warn('BigDataCloud geocoding failed:', err.message);
  }

  // ── Attempt 3: geocode.xyz (free, no key needed for low volume) ──
  try {
    const geoRes = await axios.get(
      `https://geocode.xyz/${latitude},${longitude}?json=1&auth=FREE`, {
        timeout: 10000,
      }
    );

    const data = geoRes.data;
    if (data && !data.error) {
      result.house_number = data.stnumber || '';
      result.street = data.staddress || '';
      result.city = data.city || '';
      result.district = data.region || '';
      result.state = data.state || data.region || '';
      result.country = data.country || '';
      result.pincode = data.postal || '';
      result.source = 'geocodexyz';

      const rawParts = [result.house_number, result.street, result.city, result.state, result.pincode, result.country].filter(Boolean);
      result.display_name = [...new Set(rawParts)].join(', ');
      result.short_title = [result.city, result.state, result.country].filter(Boolean).join(', ') || 'Location';
      result.full_address = buildFullAddress(result);

      return res.json(result);
    }
  } catch (err) {
    console.warn('geocode.xyz failed:', err.message);
  }

  // ── Final fallback: return coordinates as text ──
  result.display_name = `Near ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;
  result.short_title = `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;
  result.full_address = result.display_name;
  result.source = 'coordinates';

  res.json(result);
});

module.exports = router;
