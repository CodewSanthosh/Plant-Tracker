import React, { useState } from 'react';
import exifr from 'exifr';
import { addPlant } from '../services/api';

const PlantForm = ({ onPlantAdded }) => {
  const [plantName, setPlantName] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [plantedDate, setPlantedDate] = useState('');
  const [plantedBy, setPlantedBy] = useState('');
  const [location, setLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const addWatermark = async (imageFile, location) => {
    return new Promise(async (resolve, reject) => {
      try {
        let addressStr = "Address not found";
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`);
          const data = await response.json();
          if (data && data.display_name) {
            addressStr = data.display_name;
          }
        } catch (e) {
          console.error("Geocoding failed", e);
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

          // Calculate layout
          const padding = Math.max(img.width * 0.02, 10);
          const titleSize = Math.max(Math.floor(img.width * 0.03), 16);
          const textSize = Math.max(Math.floor(img.width * 0.02), 12);
          
          // Format text
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const timezoneStr = `GMT ${now.getTimezoneOffset() < 0 ? '+' : '-'}${Math.abs(now.getTimezoneOffset() / 60).toString().padStart(2, '0')}:00`;
          
          const lines = [
            addressStr,
            `Lat ${location.lat.toFixed(6)}°  Long ${location.lng.toFixed(6)}°`,
            `${dateStr} ${timeStr} ${timezoneStr}`
          ];

          // Calculate overlay height based on text
          let overlayHeight = padding * 2 + titleSize + 10;
          
          // Simple text wrapping for address
          const addressWords = addressStr.split(' ');
          let addrLine = '';
          const maxTextWidth = img.width - (padding * 2);
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
          
          overlayHeight += (wrappedAddressLines.length * (textSize + 5)) + ((textSize + 10) * 2);

          const overlayY = img.height - overlayHeight;

          // Draw dark gradient/background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, overlayY, img.width, overlayHeight);

          // Draw map icon placeholder (a simple shape)
          const iconSize = titleSize * 1.5;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillRect(padding, overlayY + padding, iconSize, iconSize);
          ctx.fillStyle = '#ff4444'; // Red pin color
          ctx.beginPath();
          ctx.arc(padding + iconSize/2, overlayY + padding + iconSize/2, iconSize*0.2, 0, Math.PI*2);
          ctx.fill();

          // Text styling
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 4;
          
          const textX = padding + iconSize + 15;
          let currentY = overlayY + padding;

          // Title (Short Location)
          ctx.font = `bold ${titleSize}px sans-serif`;
          const addressParts = addressStr.split(', ');
          const shortTitle = addressParts.slice(-3).join(', ') || "Location";
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
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        resolve(null);
      }
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      
      // Show temporary preview and status
      setImagePreview(URL.createObjectURL(file));
      setError('');
      setGeoStatus('🔍 Processing photo and finding location...');

      const loc = await determineLocation(file);
      
      if (loc) {
        setLocation(loc);
        setGeoStatus('📍 Location found! Adding watermark...');
        try {
          const watermarkedFile = await addWatermark(file, loc);
          setImage(watermarkedFile);
          setImagePreview(URL.createObjectURL(watermarkedFile)); // Show final result
          setGeoStatus('✅ Photo watermarked successfully!');
        } catch (err) {
          console.error("Watermarking failed", err);
          setImage(file);
          setGeoStatus('📍 Location found. (Watermark failed, using original photo)');
        }
      } else {
        setImage(file);
        setGeoStatus('⚠️ Could not get location. Ensure location services are enabled.');
      }
    }
  };

  const resetForm = () => {
    setPlantName('');
    setImage(null);
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
      setError('Please fill in all fields and ensure a location is auto-detected from the photo or device');
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
              ? `Location auto-detected! Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`
              : 'Take a photo above to auto-detect location.'}
          </p>
        </div>
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

