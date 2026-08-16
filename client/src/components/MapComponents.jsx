import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Pick the most recent image for a plant (latest growth update, else the original photo)
const getLatestImage = (plant) => {
  if (plant.updates && plant.updates.length > 0) {
    const sorted = [...plant.updates].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0].image;
  }
  return plant.image;
};

// Build a small circular image marker for a plant
const buildThumbIcon = (plant) =>
  L.divIcon({
    className: 'plant-thumb-marker',
    html: `
      <div style="
        width: 46px; height: 46px; border-radius: 50%;
        border: 3px solid #22c55e; overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4); background: #fff;
      ">
        <img src="${getLatestImage(plant)}" alt="${plant.plantName}"
          style="width: 100%; height: 100%; object-fit: cover; display: block;" />
      </div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 46],
    popupAnchor: [0, -46],
  });

// Component to handle map clicks for picking location
const MapEvents = ({ setLocation }) => {
  useMapEvents({
    click(e) {
      setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

// Recenter the map whenever the chosen location changes (e.g. "use current location")
const RecenterMap = ({ location }) => {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 15);
    }
  }, [location, map]);
  return null;
};

// LocationPicker used in the Add Plant Form
export const LocationPicker = ({ location, setLocation }) => {
  const defaultCenter = [20.5937, 78.9629]; // Default to India center
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const useCurrentLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError('Could not get your location. Allow location access or pick a point on the map.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-outline"
        onClick={useCurrentLocation}
        disabled={locating}
        style={{ marginBottom: '10px', padding: '8px 14px', fontSize: '0.9rem' }}
      >
        {locating ? '📍 Locating…' : '📍 Use My Current Location'}
      </button>

      {geoError && (
        <div className="form-error" style={{ marginBottom: '10px' }}>{geoError}</div>
      )}

      <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
        <MapContainer
          center={location ? [location.lat, location.lng] : defaultCenter}
          zoom={location ? 15 : 4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap location={location} />
          <MapEvents setLocation={setLocation} />
          {location && <Marker position={[location.lat, location.lng]} />}
        </MapContainer>
      </div>

      {location && (
        <small style={{ display: 'block', marginTop: '8px', color: 'var(--color-text-muted)' }}>
          Selected location: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </small>
      )}
    </div>
  );
};

// PlantMap used in Dashboard to show all plants
export const PlantMap = ({ plants, onPlantClick }) => {
  // Center map on the first plant with a location, or default center
  const plantsWithLocation = plants.filter(p => p.location && p.location.lat && p.location.lng);
  const defaultCenter = plantsWithLocation.length > 0 
    ? [plantsWithLocation[0].location.lat, plantsWithLocation[0].location.lng] 
    : [20.5937, 78.9629];

  return (
    <div style={{ height: '500px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', marginTop: '2rem' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={plantsWithLocation.length > 0 ? 5 : 4} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {plantsWithLocation.map((plant) => (
          <Marker 
            key={plant._id} 
            position={[plant.location.lat, plant.location.lng]}
            icon={buildThumbIcon(plant)}
          >
            <Popup>
              <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => onPlantClick(plant)}>
                <img 
                  src={getLatestImage(plant)} 
                  alt={plant.plantName} 
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} 
                />
                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--color-primary)' }}>{plant.plantName}</h3>
                {plant.region && <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>{plant.region}</p>}
                <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>
                  Planted: {new Date(plant.plantedDate).toLocaleDateString()}
                </p>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '4px 8px', fontSize: '10px', marginTop: '8px', width: '100%' }}
                >
                  View Timeline
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
