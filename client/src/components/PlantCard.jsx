import { useState } from 'react';

const PlantCard = ({ plant, onDelete, index, onViewTimeline, canDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(plant._id);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div
        className="plant-card glass"
        id={`plant-card-${plant._id}`}
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="plant-card__image-wrapper">
          <img
            className="plant-card__image"
            src={plant.image}
            alt={plant.plantName}
            loading="lazy"
          />
          <div className="plant-card__image-overlay" />
        </div>

        <div className="plant-card__body">
          <h3 className="plant-card__name">{plant.plantName}</h3>

          <div className="plant-card__details">
            {plant.region && (
              <div className="plant-card__detail">
                <span className="plant-card__detail-icon">📍</span>
                <span>{plant.region}</span>
              </div>
            )}
            <div className="plant-card__detail">
              <span className="plant-card__detail-icon">📅</span>
              <span>{formatDate(plant.plantedDate)}</span>
            </div>
            <div className="plant-card__detail">
              <span className="plant-card__detail-icon">👤</span>
              <span>{plant.plantedBy}</span>
            </div>
          </div>

          <div className="plant-card__footer">
            <span className="plant-card__date-added">
              Added {formatDate(plant.createdAt)}
            </span>
            {canDelete && (
              <button
                className="btn btn-danger"
                onClick={() => setShowConfirm(true)}
                id={`delete-plant-${plant._id}`}
              >
                Delete
              </button>
            )}
          </div>
        </div>

        <button 
          className="btn btn-outline btn-block" 
          onClick={() => onViewTimeline(plant)}
          style={{ marginTop: '15px' }}
        >
          View Timeline & Updates
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div
            className="confirm-dialog glass-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="confirm-dialog__title">Delete Plant?</h3>
            <p className="confirm-dialog__text">
              Are you sure you want to remove <strong>{plant.plantName}</strong>?
              This action cannot be undone.
            </p>
            <div className="confirm-dialog__actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: 'var(--space-3) var(--space-5)' }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlantCard;
