import React, { useState, useRef } from 'react';
import exifr from 'exifr';
import { addPlantUpdate, reverseGeocode } from '../services/api';

const PlantTimelineModal = ({ plant, onClose, onUpdateSuccess, canUpdate }) => {
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoMode, setPhotoMode] = useState(null); // 'capture' or 'upload'

  const captureInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  if (!plant) return null;

  const addWatermark = async (imageFile, location) => {
    return new Promise(async (resolve, reject) => {
      try {
        let geo = {
          display_name: '', short_title: 'Location',
          street: '', area: '', city: '', district: '', state: '', country: '', pincode: '',
        };

        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
          try {
            const serverGeo = await reverseGeocode(location.lat, location.lng);
            if (serverGeo) geo = serverGeo;
          } catch (e) {
            console.warn('Server geocoding failed:', e.message);
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
          ctx.drawImage(img, 0, 0);

          const padding = Math.max(img.width * 0.025, 12);
          const titleSize = Math.max(Math.floor(img.width * 0.028), 18);
          const textSize = Math.max(Math.floor(img.width * 0.020), 13);
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const timezoneStr = `GMT ${now.getTimezoneOffset() < 0 ? '+' : '-'}${Math.abs(now.getTimezoneOffset() / 60).toString().padStart(2, '0')}:${String(Math.abs(now.getTimezoneOffset() % 60)).padStart(2, '0')}`;

          const mapSize = Math.max(img.width * 0.18, 120);
          const maxTextWidth = img.width - (padding * 3 + mapSize);

          const wrapText = (text, maxW) => {
            const words = text.split(' ');
            const lines = [];
            let line = '';
            ctx.font = `${textSize}px sans-serif`;
            for (let i = 0; i < words.length; i++) {
              const test = line + words[i] + ' ';
              if (ctx.measureText(test).width > maxW && i > 0) { lines.push(line.trim()); line = words[i] + ' '; }
              else { line = test; }
            }
            lines.push(line.trim());
            return lines;
          };

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
          if (addressLines.length === 0 && geo.display_name) addressLines.push(...wrapText(geo.display_name, maxTextWidth));
          if (addressLines.length === 0) addressLines.push('Location unavailable');

          const lineH = textSize + 5;
          let textHeight = titleSize + 12 + (addressLines.length * lineH) + (textSize + 10) * 2;
          let overlayHeight = Math.max(mapSize + padding * 2, textHeight + padding * 2);
          const overlayY = img.height - overlayHeight;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, overlayY, img.width, overlayHeight);

          const mapX = padding;
          const mapY = overlayY + padding;
          ctx.fillStyle = '#e8e4d8';
          ctx.fillRect(mapX, mapY, mapSize, mapSize);
          ctx.strokeStyle = '#d4cfbf';
          ctx.lineWidth = Math.max(mapSize * 0.04, 2);
          ctx.beginPath();
          ctx.moveTo(mapX, mapY + mapSize * 0.3); ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.3);
          ctx.moveTo(mapX, mapY + mapSize * 0.7); ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.7);
          ctx.moveTo(mapX + mapSize * 0.3, mapY); ctx.lineTo(mapX + mapSize * 0.3, mapY + mapSize);
          ctx.moveTo(mapX + mapSize * 0.7, mapY); ctx.lineTo(mapX + mapSize * 0.7, mapY + mapSize);
          ctx.stroke();
          ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = Math.max(mapSize * 0.07, 4);
          ctx.beginPath(); ctx.moveTo(mapX, mapY + mapSize * 0.5); ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.5); ctx.stroke();
          ctx.fillStyle = '#c8e6c9';
          ctx.fillRect(mapX + mapSize * 0.05, mapY + mapSize * 0.05, mapSize * 0.2, mapSize * 0.2);
          ctx.fillRect(mapX + mapSize * 0.75, mapY + mapSize * 0.75, mapSize * 0.2, mapSize * 0.2);
          const pinX = mapX + mapSize / 2; const pinY2 = mapY + mapSize / 2; const pinH = mapSize * 0.35;
          ctx.fillStyle = '#ea4335'; ctx.beginPath(); ctx.moveTo(pinX, pinY2);
          ctx.bezierCurveTo(pinX - pinH * 0.5, pinY2 - pinH, pinX + pinH * 0.5, pinY2 - pinH, pinX, pinY2); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(pinX, pinY2 - pinH * 0.65, pinH * 0.18, 0, Math.PI * 2); ctx.fill();
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.font = `bold ${Math.max(Math.floor(mapSize * 0.1), 8)}px sans-serif`;
          ctx.fillText('Google', mapX + 3, mapY + mapSize - 5);

          ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top'; ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'; ctx.shadowBlur = 4;
          const textX = padding + mapSize + padding;
          let currentY = overlayY + padding;
          ctx.font = `bold ${titleSize}px sans-serif`;
          ctx.fillText(geo.short_title || 'Location', textX, currentY);
          currentY += titleSize + 12;
          ctx.font = `${textSize}px sans-serif`;
          for (const line of addressLines) { ctx.fillText(line, textX, currentY); currentY += lineH; }
          currentY += 5;
          ctx.fillText(`Lat ${location.lat.toFixed(6)}°  Long ${location.lng.toFixed(6)}°`, textX, currentY);
          currentY += textSize + 10;
          ctx.fillText(`${dateStr} ${timeStr} ${timezoneStr}`, textX, currentY);

          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
          const brandText = '📍 GPS Map Camera';
          ctx.font = `bold ${textSize}px sans-serif`;
          const brandWidth = ctx.measureText(brandText).width;
          ctx.fillStyle = '#4ade80';
          ctx.fillText(brandText, img.width - brandWidth - padding, overlayY + padding);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], imageFile.name, { type: 'image/jpeg', lastModified: Date.now() }));
            } else { reject(new Error('Canvas to Blob failed')); }
          }, 'image/jpeg', 0.9);
        };
        img.onerror = (err) => reject(err);
      } catch (error) { reject(error); }
    });
  };

  /**
   * Determine location from the update photo.
   * @param {File} file - The image file
   * @param {string} mode - 'capture' or 'upload'
   *   - capture: EXIF GPS → device GPS → plant's original location
   *   - upload: EXIF GPS only → fall back to plant's original location (NOT uploader's device GPS)
   * @returns {{ lat, lng, source }}
   */
  const determineUpdateLocation = async (file, mode) => {
    // Step 1: Always try EXIF GPS first
    try {
      const exifData = await exifr.gps(file);
      if (exifData && exifData.latitude && exifData.longitude) {
        return { lat: exifData.latitude, lng: exifData.longitude, source: 'exif' };
      }
    } catch (exifErr) {
      console.log('No EXIF GPS found in update photo:', exifErr.message);
    }

    // Step 2: For captured photos, try device GPS
    if (mode === 'capture' && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 5000,
          });
        });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'device' };
      } catch (geoErr) {
        console.log('Device GPS failed:', geoErr.message);
      }
    }

    // Step 3: Fall back to the plant's original location
    if (plant.location && plant.location.lat && plant.location.lng) {
      return { lat: plant.location.lat, lng: plant.location.lng, source: 'plant' };
    }

    return null;
  };

  const processUpdateFile = async (file, mode) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setImagePreview(URL.createObjectURL(file));
    setError('');
    setPhotoMode(mode);
    setLoading(true);
    
    try {
      // Determine location from the update photo itself
      const loc = await determineUpdateLocation(file, mode);
      
      if (loc) {
        const watermarkedFile = await addWatermark(file, loc);
        setImage(watermarkedFile);
        setImagePreview(URL.createObjectURL(watermarkedFile));

        if (loc.source === 'exif') {
          console.log('Update photo: Using EXIF GPS from photo');
        } else if (loc.source === 'device') {
          console.log('Update photo: Using device GPS');
        } else {
          console.log('Update photo: Using original plant location as fallback');
        }
      } else {
        // No location at all — still use the photo without watermark
        setImage(file);
      }
    } catch (err) {
      console.error("Watermark failed", err);
      setImage(file);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureChange = async (e) => {
    const file = e.target.files[0];
    await processUpdateFile(file, 'capture');
    e.target.value = '';
  };

  const handleUploadChange = async (e) => {
    const file = e.target.files[0];
    await processUpdateFile(file, 'upload');
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image || !date) {
      setError('Image and Date are required');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', image);
    formData.append('notes', notes);
    formData.append('date', date);

    try {
      const updatedPlant = await addPlantUpdate(plant._id, formData);
      onUpdateSuccess(updatedPlant);
      
      // Reset form
      setNotes('');
      setDate('');
      setImage(null);
      setImagePreview(null);
      setPhotoMode(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding update');
    } finally {
      setLoading(false);
    }
  };

  // Combine original plantation with updates to form a full timeline
  const timelineEvents = [
    {
      _id: 'original',
      image: plant.image,
      notes: `Planted by ${plant.plantedBy}${plant.region ? ` in ${plant.region}` : ''}`,
      date: plant.plantedDate,
      type: 'planted'
    },
    ...(plant.updates || [])
  ].sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort chronologically

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      padding: '20px'
    }}>
      <div className="modal-content glass-panel" style={{
        width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative', padding: '0'
      }}>
        <div style={{ position: 'sticky', top: 0, background: 'var(--glass-bg)', padding: '20px', borderBottom: '1px solid var(--glass-border)', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
          <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>🌱 {plant.plantName} Timeline</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text)', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* TIMELINE DISPLAY */}
          <div className="timeline-container" style={{ position: 'relative', paddingLeft: '30px' }}>
            <div style={{ position: 'absolute', left: '11px', top: 0, bottom: 0, width: '2px', background: 'var(--color-primary)', opacity: 0.3 }}></div>
            
            {timelineEvents.map((event, index) => (
              <div key={event._id || index} style={{ position: 'relative', marginBottom: '30px' }}>
                <div style={{ 
                  position: 'absolute', left: '-30px', top: '10px', width: '24px', height: '24px', 
                  borderRadius: '50%', background: 'var(--glass-bg)', border: '2px solid var(--color-primary)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px',
                  zIndex: 2
                }}>
                  {event.type === 'planted' ? '🌱' : '🌿'}
                </div>
                
                <div className="glass-panel" style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong>{event.type === 'planted' ? 'Day 1: Plantation' : 'Growth Update'}</strong>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      {new Date(event.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  
                  {event.image && (
                    <img src={event.image} alt="Update" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', background: '#111', borderRadius: '8px', marginBottom: '10px' }} />
                  )}
                  
                  {event.notes && <p style={{ margin: 0, fontSize: '0.95rem' }}>{event.notes}</p>}
                </div>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

          {/* ADD UPDATE FORM — only the owner or an admin can post updates */}
          {canUpdate ? (
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Add Growth Update</h3>
            {error && <div className="error-message" style={{ color: '#ff6b6b', marginBottom: '15px' }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div className="form-group">
                <label>Update Photo <span className="required">*</span></label>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 8px 0' }}>
                  Capture a new photo or upload a geotagged photo from the person at the plant.
                </p>

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={captureInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  capture="environment"
                  onChange={handleCaptureChange}
                />
                <input
                  type="file"
                  ref={uploadInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleUploadChange}
                />

                {/* Two action buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => captureInputRef.current?.click()}
                    style={{
                      flex: '1 1 120px', padding: '10px 14px', fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      border: photoMode === 'capture' ? '2px solid var(--color-primary)' : undefined,
                    }}
                  >
                    📷 Capture
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => uploadInputRef.current?.click()}
                    style={{
                      flex: '1 1 120px', padding: '10px 14px', fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      border: photoMode === 'upload' ? '2px solid var(--color-primary)' : undefined,
                    }}
                  >
                    📤 Upload
                  </button>
                </div>

                {imagePreview && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Date of Photo <span className="required">*</span></label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" max={new Date().toISOString().split('T')[0]} />
              </div>

              <div className="form-group">
                <label>Notes / Condition (Optional)</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  className="form-input" 
                  rows="3"
                  placeholder="How is the plant doing? e.g., 'New leaves appearing!', 'Watered today'"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
                {loading ? 'Adding Update...' : 'Add Update'}
              </button>
            </form>
          </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              You can only update plants you created.
            </p>
          )}

        </div>
      </div>
    </div>
  );
};

export default PlantTimelineModal;
