import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
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
  rating: number;
  price: number;
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
  const [locationError, setLocationError] = useState<string | null>(null);
  const defaultCenter: [number, number] = [12.3714, -1.5197]; // Ouagadougou

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLocationError(null);
        },
        (error) => {
          console.error("Error getting location:", error);
          let message = "Impossible d'obtenir votre position.";
          if (error.code === error.PERMISSION_DENIED) {
            message = "Permission de géolocalisation refusée. La carte est centrée sur Ouagadougou.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = "Position non disponible. La carte est centrée sur Ouagadougou.";
          } else if (error.code === error.TIMEOUT) {
            message = "Délai d'attente dépassé. La carte est centrée sur Ouagadougou.";
          }
          setLocationError(message);
          setUserLocation(defaultCenter);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      setUserLocation(defaultCenter);
    }
  }, []);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative">
      {locationError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md">
          <div className="bg-white/90 backdrop-blur-md border border-amber-200 p-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-amber-900 leading-tight">{locationError}</p>
            <button 
              onClick={() => setLocationError(null)}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors ml-auto"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
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
            <Tooltip direction="top" offset={[0, -30]} opacity={1}>
              <div className="font-bold text-slate-900">{ride.driverName}</div>
              <div className="text-xs text-amber-500 flex items-center gap-1">
                ★ {ride.rating}
              </div>
            </Tooltip>
            <Popup>
              <div className="p-1 min-w-[120px]">
                <h4 className="font-bold text-slate-900">{ride.driverName}</h4>
                <p className="text-xs text-slate-600 mt-1">Vers: <span className="font-medium">{ride.destination}</span></p>
                <p className="text-xs text-orange-600 font-bold mt-1">Prix: {ride.price} FCFA</p>
                <button className="mt-2 w-full py-1.5 bg-orange-600 hover:bg-orange-700 transition-colors text-white text-[11px] font-bold rounded">
                  Réserver
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
