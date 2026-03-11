import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface RideLocation {
  id: string;
  lat: number;
  lng: number;
  driverName: string;
  destination: string;
}

interface MotoMapProps {
  rides: RideLocation[];
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center);
  return null;
}

export default function MotoMap({ rides }: MotoMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const defaultCenter: [number, number] = [12.3714, -1.5197]; // Ouagadougou

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <MapContainer 
        center={userLocation || defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <div className="text-sm font-bold">Votre position</div>
            </Popup>
          </Marker>
        )}

        {rides.map((ride) => (
          <Marker key={ride.id} position={[ride.lat, ride.lng]}>
            <Popup>
              <div className="p-1">
                <h4 className="font-bold text-slate-900">{ride.driverName}</h4>
                <p className="text-xs text-slate-500">Vers: {ride.destination}</p>
                <button className="mt-2 w-full py-1 bg-orange-600 text-white text-[10px] font-bold rounded">
                  Voir le trajet
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && <ChangeView center={userLocation} />}
      </MapContainer>
    </div>
  );
}
