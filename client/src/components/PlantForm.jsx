import React, { useState, useEffect } from 'react';
import exifr from 'exifr';
import { addPlant } from '../services/api';

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

  const addWatermark = async (imageFile, location) => {
    return new Promise(async (resolve, reject) => {
      try {
        let addressStr = "";
        let geoData = null;
        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {

          // ── Attempt 1: OpenStreetMap Nominatim (requires User-Agent) ──
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=en&zoom=18&addressdetails=1`,
              { headers: { 'User-Agent': 'PlantTrackerApp/1.0' } }
            );
            if (response.ok) {
              const data = await response.json();
              if (data && !data.error) {
                geoData = data;
                if (data.display_name) addressStr = data.display_name;
              }
            }
          } catch (e) {
            console.warn("Nominatim geocoding failed:", e.message);
          }

          // ── Attempt 2: BigDataCloud free reverse geocoding ──
          if (!addressStr) {
            try {
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.lat}&longitude=${location.lng}&localityLanguage=en`
              );
              if (response.ok) {
                const data = await response.json();
                if (data) {
                  const city = data.city || data.locality || data.principalSubdivision || "";
                  const state = data.principalSubdivision || "";
                  const country = data.countryName || "";
                  // Build a geoData-like object for the shortTitle logic
                  geoData = { address: { city, state, country } };
                  const parts = [
                    data.locality, data.city, data.principalSubdivision, data.countryName
                  ].filter(Boolean);
                  // Remove duplicates while keeping order
                  addressStr = [...new Set(parts)].join(', ');
                }
              }
            } catch (e) {
              console.warn("BigDataCloud geocoding failed:", e.message);
            }
          }

          // ── Attempt 3: Fallback to coordinate string ──
          if (!addressStr) {
            addressStr = `Near ${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`;
            geoData = { address: { city: `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`, state: "", country: "" } };
          }
        }

        // Final safety net
        if (!addressStr) addressStr = "Location unavailable";

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
          
          // Format text
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const timezoneStr = `GMT ${now.getTimezoneOffset() < 0 ? '+' : '-'}${Math.abs(now.getTimezoneOffset() / 60).toString().padStart(2, '0')}:00`;

          // Simple text wrapping for address
          const addressWords = addressStr.split(' ');
          let addrLine = '';
          const mapSize = Math.max(img.width * 0.20, 140); // Scale with image width, at least 140px
          const maxTextWidth = img.width - (padding * 3 + mapSize);
          const wrappedAddressLines = [];
          
          ctx.font = `${textSize}px sans-serif`;
          for (let i = 0; i < addressWords.length; i++) {
            const testLine = addrLine + addressWords[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextWidth && i > 0) {
              wrappedAddressLines.push(addrLine);
              addrLine = addressWords[i] + ' ';
            } else {
              addrLine = testLine;
            }
          }
          wrappedAddressLines.push(addrLine);

          // Calculate overlay height based on text lines or map size
          let textHeight = titleSize + 10 + (wrappedAddressLines.length * (textSize + 5)) + ((textSize + 10) * 2);
          let overlayHeight = Math.max(mapSize + padding * 2, textHeight + padding * 2);
          const overlayY = img.height - overlayHeight;

          // Draw dark semi-transparent background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, overlayY, img.width, overlayHeight);

          // Draw mock map
          const mapX = padding;
          const mapY = overlayY + padding;
          
          // Draw map background (Google Maps cream color)
          ctx.fillStyle = '#f4f3f0';
          ctx.fillRect(mapX, mapY, mapSize, mapSize);
          
          // Draw map grid (streets)
          ctx.strokeStyle = '#e0decb';
          ctx.lineWidth = Math.max(mapSize * 0.05, 3);
          
          // horizontal lines
          ctx.beginPath();
          ctx.moveTo(mapX, mapY + mapSize * 0.3);
          ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.3);
          ctx.moveTo(mapX, mapY + mapSize * 0.7);
          ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.7);
          // vertical lines
          ctx.moveTo(mapX + mapSize * 0.3, mapY);
          ctx.lineTo(mapX + mapSize * 0.3, mapY + mapSize);
          ctx.moveTo(mapX + mapSize * 0.7, mapY);
          ctx.lineTo(mapX + mapSize * 0.7, mapY + mapSize);
          ctx.stroke();

          // Draw a highway (yellow line)
          ctx.strokeStyle = '#ffeb3b';
          ctx.lineWidth = Math.max(mapSize * 0.08, 5);
          ctx.beginPath();
          ctx.moveTo(mapX, mapY + mapSize * 0.5);
          ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.5);
          ctx.stroke();

          // Draw some parks/forests (green rectangles)
          ctx.fillStyle = '#c8e6c9';
          ctx.fillRect(mapX + mapSize * 0.05, mapY + mapSize * 0.05, mapSize * 0.2, mapSize * 0.2);
          ctx.fillRect(mapX + mapSize * 0.75, mapY + mapSize * 0.05, mapSize * 0.2, mapSize * 0.25);
          ctx.fillRect(mapX + mapSize * 0.05, mapY + mapSize * 0.75, mapSize * 0.2, mapSize * 0.2);

          // Draw red Google Maps teardrop marker in center of map
          const pinX = mapX + mapSize / 2;
          const pinY = mapY + mapSize / 2;
          const pinHeight = mapSize * 0.35;
          
          ctx.fillStyle = '#ea4335'; // Google Maps Red
          ctx.beginPath();
          ctx.moveTo(pinX, pinY);
          ctx.bezierCurveTo(
            pinX - pinHeight * 0.5, pinY - pinHeight,
            pinX + pinHeight * 0.5, pinY - pinHeight,
            pinX, pinY
          );
          ctx.fill();
          
          // White circle inside pin
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pinX, pinY - pinHeight * 0.65, pinHeight * 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Text styling
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 4;
          
          const textX = padding + mapSize + padding;
          let currentY = overlayY + padding;

          // Title (Short Location)
          ctx.font = `bold ${titleSize}px sans-serif`;
          let shortTitle = "Location";
          if (geoData && geoData.address) {
            const addr = geoData.address;
            const city = addr.city || addr.town || addr.village || addr.suburb || "";
            const state = addr.state || "";
            const country = addr.country || "";
            shortTitle = [city, state, country].filter(Boolean).join(', ') || "Location";
          } else {
            const addressParts = addressStr.split(', ');
            shortTitle = addressParts.slice(-2).join(', ') || "Location";
          }
          ctx.fillText(shortTitle, textX, currentY);
          currentY += titleSize + 10;

          // Full Address
          ctx.font = `${textSize}px sans-serif`;
          for (const line of wrappedAddressLines) {
            ctx.fillText(line, textX, currentY);
            currentY += textSize + 5;
          }
          currentY += 5;

          // Coordinates
          ctx.fillText(`Lat ${location.lat.toFixed(6)}°  Long ${location.lng.toFixed(6)}°`, textX, currentY);
          currentY += textSize + 10;

          // Date Time
          ctx.fillText(`${dateStr} ${timeStr} ${timezoneStr}`, textX, currentY);

          // Brand Watermark
          const brandText = "🌱 GPS Map Camera (Web)";
          ctx.font = `bold ${textSize}px sans-serif`;
          const brandWidth = ctx.measureText(brandText).width;
          ctx.fillStyle = '#4ade80'; // Greenish
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

  const determineLocation = (file) => {
    return new Promise(async (resolve) => {
      try {
        const exifData = await exifr.gps(file);
        if (exifData && exifData.latitude && exifData.longitude) {
          resolve({ lat: exifData.latitude, lng: exifData.longitude });
          return;
        }
      } catch (exifErr) {
        console.log('No EXIF GPS found:', exifErr.message);
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => {
             console.error("Geolocation error:", err);
             resolve(null);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      
      setOriginalImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
      setGeoStatus('🔍 Scanning photo metadata and fetching location...');

      const loc = await determineLocation(file);
      if (loc) {
        setLocation(loc);
        setGeoStatus('✅ Location detected and watermark applied!');
      } else {
        // Fallback to Chennai (Anna University) so the user gets a watermark immediately
        setLocation({ lat: 13.010758, lng: 80.235693 });
        setGeoStatus('⚠️ GPS sensor unavailable. Applied default Chennai location (edit coordinates below if needed).');
      }
    }
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
          <label htmlFor="plantImage">
            📸 Capture / Upload Plant Photo <span className="required">*</span>
          </label>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 8px 0' }}>
            Take a photo. If your phone asks, select your preferred Camera app.
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

