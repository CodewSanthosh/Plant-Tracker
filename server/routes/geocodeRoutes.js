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
    street: '',
    area: '',
    city: '',
    district: '',
    state: '',
    country: '',
    pincode: '',
    source: 'none',
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
      result.street = addr.road || addr.pedestrian || addr.footway || addr.path || '';
      result.area = addr.neighbourhood || addr.suburb || addr.hamlet || addr.quarter || '';
      result.city = addr.city || addr.town || addr.village || addr.municipality || '';
      result.district = addr.county || addr.state_district || '';
      result.state = addr.state || '';
      result.country = addr.country || '';
      result.pincode = addr.postcode || '';
      result.source = 'nominatim';

      // Build a better short_title
      result.short_title = [result.city, result.state, result.country].filter(Boolean).join(', ') || 'Location';

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
      result.pincode = '';
      result.source = 'bigdatacloud';

      const parts = [data.locality, data.city, data.principalSubdivision, data.countryName].filter(Boolean);
      result.display_name = [...new Set(parts)].join(', ');
      result.short_title = [result.city || result.area, result.state, result.country].filter(Boolean).join(', ') || 'Location';

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
      result.street = data.staddress || '';
      result.area = data.stnumber || '';
      result.city = data.city || '';
      result.district = data.region || '';
      result.state = data.state || data.region || '';
      result.country = data.country || '';
      result.pincode = data.postal || '';
      result.source = 'geocodexyz';

      const parts = [result.street, result.area, result.city, result.state, result.pincode, result.country].filter(Boolean);
      result.display_name = [...new Set(parts)].join(', ');
      result.short_title = [result.city, result.state, result.country].filter(Boolean).join(', ') || 'Location';

      return res.json(result);
    }
  } catch (err) {
    console.warn('geocode.xyz failed:', err.message);
  }

  // ── Final fallback: return coordinates as text ──
  result.display_name = `Near ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;
  result.short_title = `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;
  result.source = 'coordinates';

  res.json(result);
});

module.exports = router;
