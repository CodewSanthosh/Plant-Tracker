import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import PlantForm from '../components/PlantForm';
import PlantGrid from '../components/PlantGrid';
import { getPlants, deletePlant } from '../services/api';

const Dashboard = () => {
  const [plants, setPlants] = useState([]);
  const [plantCount, setPlantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

        <section className="plant-form-section">
          <h3 className="plant-form-section__title">
            <span>🌱</span> Add New Plant
          </h3>
          <PlantForm onPlantAdded={handlePlantAdded} />
        </section>

        <section className="plant-grid-section">
          <h3 className="plant-grid-section__title">
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
          </h3>

          {error && <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

          <PlantGrid
            plants={plants}
            onDelete={handleDeletePlant}
            loading={loading}
          />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
