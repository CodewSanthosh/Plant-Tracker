import { useState } from 'react';
import { addPlant } from '../services/api';

const PlantForm = ({ onPlantAdded }) => {
  const [formData, setFormData] = useState({
    plantName: '',
    region: '',
    plantedDate: '',
    plantedBy: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

  const resetForm = () => {
    setFormData({
      plantName: '',
      region: '',
      plantedDate: '',
      plantedBy: '',
    });
    setImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate
    if (!formData.plantName.trim()) {
      setError('Plant name is required');
      return;
    }
    if (!image) {
      setError('Please upload a plant image');
      return;
    }
    if (!formData.region.trim()) {
      setError('Planted region/place is required');
      return;
    }
    if (!formData.plantedDate) {
      setError('Date of plantation is required');
      return;
    }
    if (!formData.plantedBy.trim()) {
      setError('Person who planted is required');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('plantName', formData.plantName.trim());
      data.append('image', image);
      data.append('region', formData.region.trim());
      data.append('plantedDate', formData.plantedDate);
      data.append('plantedBy', formData.plantedBy.trim());

      const result = await addPlant(data);
      setSuccess('🌱 Plant added successfully!');
      resetForm();

      // Notify parent
      if (onPlantAdded) {
        onPlantAdded(result.plant, result.count);
      }

      // Clear success message after 3 seconds
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
            name="plantName"
            className="form-input"
            placeholder="e.g., Neem Tree"
            value={formData.plantName}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="region">
            Region / Place <span className="required">*</span>
          </label>
          <input
            type="text"
            id="region"
            name="region"
            className="form-input"
            placeholder="e.g., Hyderabad, Telangana"
            value={formData.region}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="plantedDate">
            Date of Plantation <span className="required">*</span>
          </label>
          <input
            type="date"
            id="plantedDate"
            name="plantedDate"
            className="form-input"
            value={formData.plantedDate}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="plantedBy">
            Planted By <span className="required">*</span>
          </label>
          <input
            type="text"
            id="plantedBy"
            name="plantedBy"
            className="form-input"
            placeholder="e.g., John Doe"
            value={formData.plantedBy}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="plantImage">
            Plant Image <span className="required">*</span>
          </label>
          <input
            type="file"
            id="plantImage"
            className="form-input"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
          />
          {imagePreview && (
            <div className="plant-form__image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
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
