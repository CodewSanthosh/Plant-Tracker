import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
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

// Component to handle map clicks for picking location
const MapEvents = ({ setLocation }) => {
  useMapEvents({
    click(e) {
      setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

// LocationPicker used in the Add Plant Form
export const LocationPicker = ({ location, setLocation }) => {
  const defaultCenter = [20.5937, 78.9629]; // Default to India center

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
      <MapContainer 
        center={location ? [location.lat, location.lng] : defaultCenter} 
        zoom={location ? 12 : 4} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents setLocation={setLocation} />
        {location && <Marker position={[location.lat, location.lng]} />}
      </MapContainer>
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
          >
            <Popup>
              <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => onPlantClick(plant)}>
                <img 
                  src={plant.image} 
                  alt={plant.plantName} 
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} 
                />
                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--color-primary)' }}>{plant.plantName}</h3>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>{plant.region}</p>
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
