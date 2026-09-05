import React, { useState, useEffect, useRef } from 'react';
import exifr from 'exifr';
import { addPlant, reverseGeocode } from '../services/api';

const PlantForm = ({ onPlantAdded }) => {
  const [plantName, setPlantName] = useState('');
  const [image, setImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [plantedDate, setPlantedDate] = useState('');
  const [plantedBy, setPlantedBy] = useState('');
  const [location, setLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [watermarking, setWatermarking] = useState(false);
  const [photoMode, setPhotoMode] = useState(null); // 'capture' or 'upload'

  const captureInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const addWatermark = async (imageFile, location) => {
    return new Promise(async (resolve, reject) => {
      try {
        // ── Fetch address from our own server (reliable, no CORS issues) ──
        let geo = {
          display_name: '',
          short_title: 'Location',
          street: '', area: '', city: '', district: '', state: '', country: '', pincode: '',
        };

        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
          try {
            const serverGeo = await reverseGeocode(location.lat, location.lng);
            if (serverGeo) geo = serverGeo;
          } catch (e) {
            console.warn("Server geocoding failed, using fallback:", e.message);
            geo.display_name = `Near ${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`;
            geo.short_title = `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`;
          }
        }

        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Calculate dynamic layout sizes based on image dimensions
          const padding = Math.max(img.width * 0.025, 12);
          const titleSize = Math.max(Math.floor(img.width * 0.028), 18);
          const textSize = Math.max(Math.floor(img.width * 0.020), 13);
          
          // Format date/time
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const timezoneStr = `GMT ${now.getTimezoneOffset() < 0 ? '+' : '-'}${Math.abs(now.getTimezoneOffset() / 60).toString().padStart(2, '0')}:${String(Math.abs(now.getTimezoneOffset() % 60)).padStart(2, '0')}`;

          // ── Build address lines for the watermark ──
          const mapSize = Math.max(img.width * 0.18, 120);
          const maxTextWidth = img.width - (padding * 3 + mapSize);

          // Helper to wrap long text
          const wrapText = (text, maxW) => {
            const words = text.split(' ');
            const lines = [];
            let line = '';
            ctx.font = `${textSize}px sans-serif`;
            for (let i = 0; i < words.length; i++) {
              const test = line + words[i] + ' ';
              if (ctx.measureText(test).width > maxW && i > 0) {
                lines.push(line.trim());
                line = words[i] + ' ';
              } else {
                line = test;
              }
            }
            lines.push(line.trim());
            return lines;
          };

          // Build detailed address lines using the server's structured full_address
          const addressLines = [];

          if (geo.full_address) {
            addressLines.push(...wrapText(geo.full_address, maxTextWidth));
          } else {
            const streetPart = [geo.house_number, geo.street].filter(Boolean).join(', ');
            const streetArea = [streetPart, geo.building, geo.area].filter(Boolean).join(', ');
            if (streetArea) addressLines.push(...wrapText(streetArea, maxTextWidth));

            const cityDistrict = [geo.city, geo.district].filter(Boolean).join(', ');
            const cityLine = geo.pincode ? `${cityDistrict} - ${geo.pincode}` : cityDistrict;
            if (cityLine) addressLines.push(...wrapText(cityLine, maxTextWidth));

            const stateCountry = [geo.state, geo.country].filter(Boolean).join(', ');
            if (stateCountry) addressLines.push(...wrapText(stateCountry, maxTextWidth));
          }

          if (addressLines.length === 0 && geo.display_name) {
            addressLines.push(...wrapText(geo.display_name, maxTextWidth));
          }
          if (addressLines.length === 0) {
            addressLines.push('Location unavailable');
          }

          // Calculate overlay height
          const lineH = textSize + 5;
          const coordLineH = textSize + 10;
          const dateLineH = textSize + 10;
          let textHeight = titleSize + 12 + (addressLines.length * lineH) + coordLineH + dateLineH;
          let overlayHeight = Math.max(mapSize + padding * 2, textHeight + padding * 2);
          const overlayY = img.height - overlayHeight;

          // ── Draw dark semi-transparent background ──
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, overlayY, img.width, overlayHeight);

          // ── Draw mock satellite map ──
          const mapX = padding;
          const mapY = overlayY + padding;
          
          ctx.fillStyle = '#e8e4d8';
          ctx.fillRect(mapX, mapY, mapSize, mapSize);
          
          ctx.strokeStyle = '#d4cfbf';
          ctx.lineWidth = Math.max(mapSize * 0.04, 2);
          ctx.beginPath();
          ctx.moveTo(mapX, mapY + mapSize * 0.3);
          ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.3);
          ctx.moveTo(mapX, mapY + mapSize * 0.7);
          ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.7);
          ctx.moveTo(mapX + mapSize * 0.3, mapY);
          ctx.lineTo(mapX + mapSize * 0.3, mapY + mapSize);
          ctx.moveTo(mapX + mapSize * 0.7, mapY);
          ctx.lineTo(mapX + mapSize * 0.7, mapY + mapSize);
          ctx.stroke();

          ctx.strokeStyle = '#ffeb3b';
          ctx.lineWidth = Math.max(mapSize * 0.07, 4);
          ctx.beginPath();
          ctx.moveTo(mapX, mapY + mapSize * 0.5);
          ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.5);
          ctx.stroke();

          ctx.fillStyle = '#c8e6c9';
          ctx.fillRect(mapX + mapSize * 0.05, mapY + mapSize * 0.05, mapSize * 0.2, mapSize * 0.2);
          ctx.fillRect(mapX + mapSize * 0.75, mapY + mapSize * 0.75, mapSize * 0.2, mapSize * 0.2);

          const pinX = mapX + mapSize / 2;
          const pinY2 = mapY + mapSize / 2;
          const pinH = mapSize * 0.35;
          ctx.fillStyle = '#ea4335';
          ctx.beginPath();
          ctx.moveTo(pinX, pinY2);
          ctx.bezierCurveTo(pinX - pinH * 0.5, pinY2 - pinH, pinX + pinH * 0.5, pinY2 - pinH, pinX, pinY2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pinX, pinY2 - pinH * 0.65, pinH * 0.18, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.font = `bold ${Math.max(Math.floor(mapSize * 0.1), 8)}px sans-serif`;
          ctx.fillText('Google', mapX + 3, mapY + mapSize - 5);

          // ── Draw text ──
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 4;
          
          const textX = padding + mapSize + padding;
          let currentY = overlayY + padding;

          ctx.font = `bold ${titleSize}px sans-serif`;
          ctx.fillText(geo.short_title || 'Location', textX, currentY);
          currentY += titleSize + 12;

          ctx.font = `${textSize}px sans-serif`;
          for (const line of addressLines) {
            ctx.fillText(line, textX, currentY);
            currentY += lineH;
          }
          currentY += 5;

          ctx.fillText(`Lat ${location.lat.toFixed(6)}°  Long ${location.lng.toFixed(6)}°`, textX, currentY);
          currentY += coordLineH;

          ctx.fillText(`${dateStr} ${timeStr} ${timezoneStr}`, textX, currentY);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          const brandText = "📍 GPS Map Camera";
          ctx.font = `bold ${textSize}px sans-serif`;
          const brandWidth = ctx.measureText(brandText).width;
          ctx.fillStyle = '#4ade80';
          ctx.fillText(brandText, img.width - brandWidth - padding, overlayY + padding);

          canvas.toBlob((blob) => {
            if (blob) {
              const watermarkedFile = new File([blob], imageFile.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(watermarkedFile);
            } else {
              reject(new Error("Canvas to Blob failed"));
            }
          }, 'image/jpeg', 0.9);
        };
        img.onerror = (err) => reject(err);
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * Determine location from photo.
   * @param {File} file - The image file
   * @param {string} mode - 'capture' or 'upload'
   *   - capture: try EXIF GPS → then device GPS (user is physically at the plant)
   *   - upload: EXIF GPS only (photo was taken by someone else, never use uploader's device GPS)
   * @returns {{ lat, lng, source } | null}
   */
  const determineLocation = (file, mode) => {
    return new Promise(async (resolve) => {
      // Step 1: Always try EXIF GPS first
      try {
        const exifData = await exifr.gps(file);
        if (exifData && exifData.latitude && exifData.longitude) {
          resolve({ lat: exifData.latitude, lng: exifData.longitude, source: 'exif' });
          return;
        }
      } catch (exifErr) {
        console.log('No EXIF GPS found:', exifErr.message);
      }

      // Step 2: For captured photos only, fall back to device GPS
      if (mode === 'capture' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'device' }),
          (err) => {
             console.error("Geolocation error:", err);
             resolve(null);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        // For uploaded photos: no EXIF GPS found → return null (manual entry needed)
        resolve(null);
      }
    });
  };

  // Re-run watermarking if location or originalImage changes
  useEffect(() => {
    if (originalImage && location) {
      const applyWatermark = async () => {
        setWatermarking(true);
        try {
          const watermarkedFile = await addWatermark(originalImage, location);
          setImage(watermarkedFile);
          setImagePreview(URL.createObjectURL(watermarkedFile));
        } catch (err) {
          console.error("Watermark update failed", err);
        } finally {
          setWatermarking(false);
        }
      };
      
      const timer = setTimeout(applyWatermark, 600);
      return () => clearTimeout(timer);
    }
  }, [location, originalImage]);

  const processFile = async (file, mode) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    
    setOriginalImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
    setPhotoMode(mode);
    setGeoStatus('🔍 Scanning photo metadata and fetching location...');

    const loc = await determineLocation(file, mode);
    if (loc) {
      setLocation({ lat: loc.lat, lng: loc.lng });
      if (loc.source === 'exif') {
        setGeoStatus('✅ Location detected from photo GPS data! Watermark applied.');
      } else {
        setGeoStatus('✅ Location detected from device GPS. Watermark applied!');
      }
    } else {
      // No GPS available — prompt manual entry
      setLocation(null);
      if (mode === 'upload') {
        setGeoStatus('⚠️ This photo has no GPS data embedded. Please enter the location manually below.');
      } else {
        setGeoStatus('⚠️ No GPS data available. Please enter the location manually below.');
      }
    }
  };

  const handleCaptureChange = async (e) => {
    const file = e.target.files[0];
    await processFile(file, 'capture');
    e.target.value = '';
  };

  const handleUploadChange = async (e) => {
    const file = e.target.files[0];
    await processFile(file, 'upload');
    e.target.value = '';
  };

  const resetForm = () => {
    setPlantName('');
    setImage(null);
    setOriginalImage(null);
    setImagePreview(null);
    setPlantedDate('');
    setPlantedBy('');
    setLocation(null);
    setGeoStatus('');
    setPhotoMode(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!plantName.trim() || !image || !plantedDate || !plantedBy.trim() || !location) {
      setError('Please fill in all fields and ensure a location is set for the photo');
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
          <label>
            📸 Plant Photo <span className="required">*</span>
          </label>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 10px 0' }}>
            Capture a new photo or upload an existing geotagged photo.
          </p>

          {/* Hidden file inputs */}
          <input
            type="file"
            ref={captureInputRef}
            style={{ display: 'none' }}
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            onChange={handleCaptureChange}
          />
          <input
            type="file"
            ref={uploadInputRef}
            style={{ display: 'none' }}
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUploadChange}
          />

          {/* Two action buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => captureInputRef.current?.click()}
              style={{ 
                flex: '1 1 140px', padding: '12px 16px', fontSize: '0.95rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                border: photoMode === 'capture' ? '2px solid var(--color-primary)' : undefined,
              }}
            >
              📷 Capture Photo
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => uploadInputRef.current?.click()}
              style={{
                flex: '1 1 140px', padding: '12px 16px', fontSize: '0.95rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                border: photoMode === 'upload' ? '2px solid var(--color-primary)' : undefined,
              }}
            >
              📤 Upload Photo
            </button>
          </div>

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
          <div className="location-inputs" style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="latitude" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Latitude</label>
              <input
                type="number"
                step="any"
                id="latitude"
                className="form-input"
                value={location ? location.lat : ''}
                onChange={(e) => setLocation(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))}
                placeholder="e.g. 13.010758"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="longitude" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Longitude</label>
              <input
                type="number"
                step="any"
                id="longitude"
                className="form-input"
                value={location ? location.lng : ''}
                onChange={(e) => setLocation(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))}
                placeholder="e.g. 80.235693"
              />
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            💡 You can adjust the coordinates manually. The watermark on the photo updates dynamically!
          </p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <button
        type="submit"
        className="btn btn-primary plant-form__submit"
        disabled={loading || watermarking}
        id="submit-plant-btn"
        style={{ marginTop: 'var(--space-4)' }}
      >
        {loading ? 'Adding Plant...' : watermarking ? 'Applying GPS Watermark...' : '🌱 Add Plant'}
      </button>
    </form>
  );
};

export default PlantForm;
