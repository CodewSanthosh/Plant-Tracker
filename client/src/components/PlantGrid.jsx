import PlantCard from './PlantCard';

const PlantGrid = ({ plants, onDelete, loading, onViewTimeline, canDelete }) => {
  if (loading) {
    return (
      <div className="loading">
        <div className="loading__spinner" />
      </div>
    );
  }

  if (!plants || plants.length === 0) {
    return (
      <div className="empty-state" id="empty-state">
        <span className="empty-state__icon">🌿</span>
        <h3 className="empty-state__title">No plants yet</h3>
        <p className="empty-state__text">
          Start by adding your first plant using the form above!
        </p>
      </div>
    );
  }

  return (
    <div className="plant-grid" id="plant-grid">
      {plants.map((plant, index) => (
        <PlantCard
          key={plant._id}
          plant={plant}
          onDelete={onDelete}
          onViewTimeline={onViewTimeline}
          canDelete={canDelete}
          index={index}
        />
      ))}
    </div>
  );
};

export default PlantGrid;
