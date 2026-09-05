import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import PlantForm from '../components/PlantForm';
import PlantGrid from '../components/PlantGrid';
import { PlantMap } from '../components/MapComponents';
import PlantTimelineModal from '../components/PlantTimelineModal';
import { getPlants, deletePlant } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { isAdmin, user } = useAuth();
  const [plants, setPlants] = useState([]);
  const [plantCount, setPlantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTimelinePlant, setActiveTimelinePlant] = useState(null);

  const fetchPlants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPlants();
      setPlants(data.plants);
      setPlantCount(data.count);
    } catch (err) {
      setError('Failed to load plants');
      console.error('Fetch plants error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  const handlePlantAdded = (newPlant, count) => {
    setPlants((prev) => [newPlant, ...prev]);
    setPlantCount(count);
  };

  const handleDeletePlant = async (id) => {
    try {
      const result = await deletePlant(id);
      setPlants((prev) => prev.filter((p) => p._id !== id));
      setPlantCount(result.count);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleUpdateSuccess = (updatedPlant) => {
    setPlants(prev => prev.map(p => p._id === updatedPlant._id ? updatedPlant : p));
    setActiveTimelinePlant(updatedPlant);
  };

  // Check if current user can update a given plant (owner or admin)
  const canUpdatePlant = (plant) => {
    if (isAdmin) return true;
    if (!plant || !user) return false;
    return plant.user === user._id || plant.user?._id === user._id;
  };

  return (
    <div id="dashboard">
      <Navbar plantCount={plantCount} />

      <main className="dashboard">
        <div className="dashboard__header">
          <h2 className="dashboard__title">🌍 Track Your Green Impact</h2>
          <p className="dashboard__subtitle">
            Every plant counts. Add and monitor your plantation journey.
          </p>
        </div>

        {/* All logged-in users can add plants */}
        <section className="plant-form-section">
          <h3 className="plant-form-section__title">
            <span>🌱</span> Add New Plant
          </h3>
          <PlantForm onPlantAdded={handlePlantAdded} />
        </section>

        <section className="plant-grid-section">
          <h3 className="plant-grid-section__title" style={{ display: 'flex', alignItems: 'center' }}>
            <span>🌳</span> All Planted Trees
            {plantCount > 0 && (
              <span style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-primary)',
                fontWeight: 400,
              }}>
                ({plantCount} {plantCount === 1 ? 'plant' : 'plants'})
              </span>
            )}
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              <button 
                className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setViewMode('grid')}
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
              >
                Grid View
              </button>
              <button 
                className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setViewMode('map')}
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
              >
                Map View
              </button>
            </div>
          </h3>

          {error && <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

          {viewMode === 'grid' ? (
            <PlantGrid
              plants={plants}
              onDelete={handleDeletePlant}
              onViewTimeline={setActiveTimelinePlant}
              currentUserId={user?._id}
              isAdmin={isAdmin}
              loading={loading}
            />
          ) : (
            <PlantMap 
              plants={plants} 
              onPlantClick={setActiveTimelinePlant}
            />
          )}
        </section>
      </main>

      {activeTimelinePlant && (
        <PlantTimelineModal 
          plant={activeTimelinePlant} 
          onClose={() => setActiveTimelinePlant(null)}
          onUpdateSuccess={handleUpdateSuccess}
          canUpdate={canUpdatePlant(activeTimelinePlant)}
        />
      )}
    </div>
  );
};

export default Dashboard;
