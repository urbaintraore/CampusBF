import React, { useState } from 'react';
import { MapPin, Navigation, Clock, Users, Star, Shield, Search, Plus, Bike, CreditCard, ChevronRight, AlertCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import MotoMap from '@/components/MotoMap';

export default function MotoRide() {
  const { user, addMotoRide, motoRides, reserveMotoRide, logAction } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'offer'>('search');
  
  // Form states
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [motorcycle, setMotorcycle] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [helmetAvailable, setHelmetAvailable] = useState(false);
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | null>(null);

  const isRideExpired = (rideDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rideD = new Date(rideDate);
    rideD.setHours(0, 0, 0, 0);
    
    return rideD < today;
  };

  const handlePublishRide = async () => {
    if (!user || !departure || !destination || !date || !time || !price || !motorcycle || !whatsappNumber) {
      alert("Veuillez remplir tous les champs, y compris votre numéro WhatsApp.");
      return;
    }
    if (isRideExpired(date)) {
      alert("La date de départ ne peut pas être dans le passé.");
      return;
    }
    await addMotoRide({
      driverId: user.id,
      driverName: `${user.firstName} ${user.lastName}`,
      driverAvatar: user.avatarUrl,
      driverRating: 5, // Default rating
      departure,
      destination,
      date,
      time,
      price: Number(price),
      distance: 'Inconnu', // Should be calculated
      motorcycle,
      helmetAvailable,
      whatsappNumber,
      lat: 0, // Should be geocoded
      lng: 0
    });
    if (logAction) {
      logAction('Proposition de trajet', `De ${departure} à ${destination}`);
    }
    alert("Trajet publié avec succès !");
    setDeparture('');
    setDestination('');
    setDate('');
    setTime('');
    setPrice('');
    setMotorcycle('');
    setWhatsappNumber('');
    setHelmetAvailable(false);
  };

  const filteredRides = (motoRides || []).filter(ride => {
    const matchDeparture = departure ? ride.departure.toLowerCase().includes(departure.toLowerCase()) : true;
    const matchDestination = destination ? ride.destination.toLowerCase().includes(destination.toLowerCase()) : true;
    const matchDate = date ? ride.date === date : true;
    const isExpired = isRideExpired(ride.date);
    return matchDeparture && matchDestination && matchDate && !isExpired;
  });

  if (priceSort === 'asc') {
    filteredRides.sort((a, b) => a.price - b.price);
  } else if (priceSort === 'desc') {
    filteredRides.sort((a, b) => b.price - a.price);
  }

  const mapRides = filteredRides.map(ride => ({
    id: ride.id,
    lat: ride.lat,
    lng: ride.lng,
    driverName: ride.driverName,
    destination: ride.destination,
    rating: ride.driverRating,
    price: ride.price
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <Bike size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">MotoRide</h1>
          </div>
          <p className="text-slate-500 text-sm">Le covoiturage à moto 100% étudiant. Rapide, économique et convivial.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveTab('search')}
          className={cn(
            "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
            activeTab === 'search' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Chercher un trajet
        </button>
        <button
          onClick={() => setActiveTab('offer')}
          className={cn(
            "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
            activeTab === 'offer' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Proposer un trajet
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {activeTab === 'search' ? 'Où allez-vous ?' : 'Détails de votre trajet'}
            </h2>
            
            <form className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-slate-400"></div>
                  <input 
                    type="text" 
                    placeholder="Lieu de départ (ex: Zogona)"
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-orange-500"></div>
                  <input 
                    type="text" 
                    placeholder="Destination (ex: UJKZ)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>

                <div className={cn(
                  "grid gap-4",
                  activeTab === 'search' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
                )}>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>

                  {activeTab === 'offer' ? (
                    <div className="flex gap-2">
                      {['Matin', 'Après-Midi', 'Soir'].map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setTime(period)}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                            time === period 
                              ? "bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-200" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600"
                          )}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {activeTab === 'offer' && (
                    <>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">FCFA</span>
                        <input 
                          type="number" 
                          placeholder="Prix"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full pl-16 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Modèle de moto"
                        value={motorcycle}
                        onChange={(e) => setMotorcycle(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="Numéro WhatsApp (ex: +226...)"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input 
                          type="checkbox" 
                          checked={helmetAvailable}
                          onChange={(e) => setHelmetAvailable(e.target.checked)}
                          className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                        />
                        Casque disponible
                      </label>
                    </>
                  )}
                </div>

                <button 
                  type="button"
                  onClick={activeTab === 'offer' ? handlePublishRide : undefined}
                  className="w-full py-3.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                >
                  {activeTab === 'search' ? (
                    <>
                      <Search size={20} />
                      Rechercher un trajet
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Publier le trajet
                    </>
                  )}
                </button>
              </form>
            </div>

          {/* Results Area (Only visible when searching) */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Trajets disponibles autour de vous</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Trier par prix:</span>
                  <button 
                    onClick={() => setPriceSort(priceSort === 'asc' ? null : 'asc')}
                    className={cn("px-2.5 py-1 text-xs font-bold rounded-md transition-colors", priceSort === 'asc' ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                  >
                    Croissant
                  </button>
                  <button 
                    onClick={() => setPriceSort(priceSort === 'desc' ? null : 'desc')}
                    className={cn("px-2.5 py-1 text-xs font-bold rounded-md transition-colors", priceSort === 'desc' ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                  >
                    Décroissant
                  </button>
                </div>
              </div>
              
              {filteredRides.length > 0 ? filteredRides.map((ride) => (
                <div key={ride.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-orange-200 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <img src={ride.driverAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ride.driverName}`} alt={ride.driverName} className="w-12 h-12 rounded-full bg-slate-100" />
                      <div>
                        <h4 className="font-bold text-slate-900">{ride.driverName}</h4>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span>{ride.driverRating}</span>
                          <span className="mx-1">•</span>
                          <span>{ride.motorcycle}</span>
                        </div>
                        {ride.whatsappNumber && (
                          <div className="text-xs text-emerald-600 font-medium mt-1">
                            WhatsApp: {ride.whatsappNumber}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">{ride.price} FCFA</div>
                      <div className="text-xs text-slate-500">{ride.distance}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex-1 relative">
                      <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
                      <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-white"></div>
                        <span className="font-medium text-slate-700">{ride.departure}</span>
                      </div>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="font-medium text-slate-900">{ride.destination}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5">
                        <Clock size={14} />
                        {ride.time}
                      </div>
                      {ride.helmetAvailable && (
                        <div className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                          <Shield size={12} /> Casque dispo
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (isRideExpired(ride.date)) {
                        alert("Ce trajet a déjà expiré.");
                      } else {
                        const clientWhatsapp = prompt("Veuillez entrer votre numéro WhatsApp pour que le conducteur puisse vous contacter :");
                        if (clientWhatsapp) {
                          reserveMotoRide(ride.id, clientWhatsapp);
                          alert("Réservation envoyée ! Le conducteur a été notifié.");
                        }
                      }
                    }}
                    className="w-full py-2.5 bg-orange-50 text-orange-700 font-bold rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors"
                  >
                    Réserver
                  </button>
                </div>
              )) : (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search size={24} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">Aucun trajet trouvé pour ces critères.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar / Map Area */}
        <div className="space-y-6">
          <div className="h-64 md:h-80 relative">
            <MotoMap rides={mapRides} />
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Shield size={18} className="text-emerald-500" />
              Sécurité avant tout
            </h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                <p>Tous les conducteurs sont des étudiants vérifiés.</p>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                <p>Partagez votre trajet en temps réel avec un proche.</p>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                <p>Paiement sécurisé via Mobile Money.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
