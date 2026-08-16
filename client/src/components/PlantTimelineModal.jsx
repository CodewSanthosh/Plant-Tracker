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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
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
                    <img src={event.image} alt="Update" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
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
