import React, { useState, useEffect } from 'react';
import exifr from 'exifr';
import { addPlant } from '../services/api';
import { LocationPicker } from './MapComponents';

const PlantForm = ({ onPlantAdded }) => {
  const [plantName, setPlantName] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [plantedDate, setPlantedDate] = useState('');
  const [plantedBy, setPlantedBy] = useState('');
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [geoStatus, setGeoStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fetch address when location changes
  useEffect(() => {
    const fetchAddress = async () => {
      if (!location || !location.lat || !location.lng) return;
      
      try {
        setGeoStatus('🔍 Fetching address details...');
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.display_name) {
          setAddress(data.display_name);
          setGeoStatus('📍 Location and address auto-detected!');
        } else {
          setGeoStatus('📍 Location detected, but address not found.');
        }
      } catch (err) {
        console.error('Reverse geocoding failed:', err);
        setGeoStatus('📍 Location detected, but address fetch failed.');
      }
    };

    // Add a small debounce to avoid spamming the API if user clicks map rapidly
    const timeoutId = setTimeout(() => {
      fetchAddress();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [location]);

  // Try to extract GPS from EXIF, fallback to device GPS
  const extractGeoTag = async (file) => {
    setGeoStatus('🔍 Reading geotag from photo…');

    try {
      // Try EXIF GPS extraction first
      const exifData = await exifr.gps(file);
      if (exifData && exifData.latitude && exifData.longitude) {
        setLocation({ lat: exifData.latitude, lng: exifData.longitude });
        setGeoStatus('📍 Location auto-detected from photo EXIF data!');
        return;
      }
    } catch (exifErr) {
      console.log('No EXIF GPS found:', exifErr.message);
    }

    // Fallback: try device GPS
    if (navigator.geolocation) {
      setGeoStatus('📍 No EXIF GPS found. Getting device location…');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoStatus('📍 Location captured from device GPS!');
        },
        () => {
          setGeoStatus('⚠️ Could not get location. Please pick manually on the map below.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoStatus('⚠️ Geolocation not supported. Please pick location on the map below.');
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');

      // Auto-extract geotag
      await extractGeoTag(file);
    }
  };

  const resetForm = () => {
    setPlantName('');
    setImage(null);
    setImagePreview(null);
    setPlantedDate('');
    setPlantedBy('');
    setLocation(null);
    setAddress('');
    setGeoStatus('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!plantName.trim() || !image || !plantedDate || !plantedBy.trim() || !location) {
      setError('Please fill in all fields and ensure a location is set (auto-detected or picked on map)');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('plantName', plantName.trim());
      data.append('image', image);
      data.append('plantedDate', plantedDate);
      data.append('plantedBy', plantedBy.trim());
      data.append('lat', location.lat);
      data.append('lng', location.lng);
      if (address) {
        data.append('address', address.trim());
      }

      const result = await addPlant(data);
      setSuccess('🌱 Plant added successfully!');
      resetForm();

      if (onPlantAdded) {
        onPlantAdded(result.plant, result.count);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add plant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="plant-form glass" onSubmit={handleSubmit} id="add-plant-form">
      <div className="plant-form__grid">
        <div className="form-group">
          <label htmlFor="plantName">
            Plant Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="plantName"
            className="form-input"
            placeholder="e.g., Neem Tree"
            value={plantName}
            onChange={(e) => setPlantName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="plantedDate">
            Date of Plantation <span className="required">*</span>
          </label>
          <input
            type="date"
            id="plantedDate"
            className="form-input"
            value={plantedDate}
            onChange={(e) => setPlantedDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="plantedBy">
            Planted By <span className="required">*</span>
          </label>
          <input
            type="text"
            id="plantedBy"
            className="form-input"
            value={plantedBy}
            onChange={(e) => setPlantedBy(e.target.value)}
            placeholder="e.g. John Doe, Community Group"
          />
        </div>

        <div className="form-group">
          <label htmlFor="plantImage">
            📸 Capture / Upload Plant Photo <span className="required">*</span>
          </label>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 8px 0' }}>
            Take a photo with your camera or select an image. GPS location will be auto-detected from the photo or your device.
          </p>
          <input
            type="file"
            id="plantImage"
            className="form-input"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            onChange={handleImageChange}
          />
          {imagePreview && (
            <div className="plant-form__image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
        </div>

        {/* Geo status message */}
        {geoStatus && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className={geoStatus.startsWith('⚠️') ? 'form-error' : 'form-success'} style={{ fontSize: '0.9rem' }}>
              {geoStatus}
            </div>
          </div>
        )}

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>
            Plantation Location <span className="required">*</span>
          </label>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 10px 0' }}>
            {location
              ? 'Location auto-detected! You can adjust it by clicking on the map below.'
              : 'Take a photo above to auto-detect location, or pick manually on the map.'}
          </p>
          <LocationPicker location={location} setLocation={setLocation} />
        </div>

        {location && (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="address">
              Detected Address Details
            </label>
            <textarea
              id="address"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address will auto-populate here..."
              rows="3"
            />
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <button
        type="submit"
        className="btn btn-primary plant-form__submit"
        disabled={loading}
        id="submit-plant-btn"
        style={{ marginTop: 'var(--space-4)' }}
      >
        {loading ? 'Adding Plant...' : '🌱 Add Plant'}
      </button>
    </form>
  );
};

export default PlantForm;

