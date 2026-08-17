import React, { useState } from 'react';
import { addPlantUpdate } from '../services/api';

const PlantTimelineModal = ({ plant, onClose, onUpdateSuccess, canUpdate }) => {
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!plant) return null;

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
                  geoData = { address: { city, state, country } };
                  const parts = [
                    data.locality, data.city, data.principalSubdivision, data.countryName
                  ].filter(Boolean);
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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setImagePreview(URL.createObjectURL(file));
      setError('');
      setLoading(true);
      
      try {
        const watermarkedFile = await addWatermark(file, plant.location);
        setImage(watermarkedFile);
        setImagePreview(URL.createObjectURL(watermarkedFile));
      } catch (err) {
        console.error("Watermark failed", err);
        setImage(file);
      } finally {
        setLoading(false);
      }
    }
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
                <div className="file-input-wrapper">
                  <input type="file" id="update-image" accept="image/*" onChange={handleImageChange} className="file-input" />
                  <label htmlFor="update-image" className="file-input-label">
                    {image ? image.name : 'Choose an image...'}
                  </label>
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
              Only admins can post growth updates to plants.
            </p>
          )}

        </div>
      </div>
    </div>
  );
};

export default PlantTimelineModal;
