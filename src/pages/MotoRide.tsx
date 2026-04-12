import React, { useState } from 'react';
import { MapPin, Navigation, Clock, Users, Star, Shield, Search, Plus, Bike, CreditCard, ChevronRight, AlertCircle, Lock, Flag, CheckCircle, UserCheck, Car, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import MotoMap from '@/components/MotoMap';

export default function MotoRide() {
  const { user, addMotoRide, motoRides, reserveMotoRide, logAction, reportRideUser, reviewRide, updateRideStatus, users } = useAuth();
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
  const [vehicleType, setVehicleType] = useState<'moto' | 'car'>('moto');
  const [plateNumber, setPlateNumber] = useState('');
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | null>(null);

  // Report state
  const [reportingRideId, setReportingRideId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  // Review state
  const [reviewingRideId, setReviewingRideId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const isRideExpired = (rideDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rideD = new Date(rideDate);
    rideD.setHours(0, 0, 0, 0);
    
    return rideD < today;
  };

  const handlePublishRide = async () => {
    if (!user) return;
    
    if (user.motoRideStatus === 'suspended') {
      alert("Votre compte MotoRide est suspendu. Vous ne pouvez pas proposer de trajets.");
      return;
    }

    if (!user.isVerified) {
      alert("Vous devez vérifier votre compte (Email, Nom réel, Université) avant de proposer un trajet.");
      return;
    }

    if (!user.isDriverVerified) {
      alert("Votre profil de conducteur n'est pas encore vérifié par un administrateur.");
      return;
    }

    if (!departure || !destination || !date || !time || !price || !motorcycle || !whatsappNumber || !plateNumber) {
      alert("Veuillez remplir tous les champs obligatoires, y compris le numéro d'immatriculation.");
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
      driverRating: user.motoRideStats?.averageRating || 5,
      departure,
      destination,
      date,
      time,
      price: Number(price),
      distance: 'Inconnu',
      motorcycle,
      vehicleDetails: {
        type: vehicleType,
        plateNumber,
      },
      helmetAvailable,
      whatsappNumber,
      lat: 0,
      lng: 0,
      status: 'active',
      passengers: []
    });
    
    alert("Trajet publié avec succès !");
    setDeparture('');
    setDestination('');
    setDate('');
    setTime('');
    setPrice('');
    setMotorcycle('');
    setWhatsappNumber('');
    setPlateNumber('');
    setHelmetAvailable(false);
  };

  const handleReportUser = async (reportedUserId: string, rideId: string) => {
    if (!reportReason) {
      alert("Veuillez indiquer une raison pour le signalement.");
      return;
    }
    await reportRideUser(reportedUserId, rideId, reportReason);
    setReportingRideId(null);
    setReportReason('');
  };

  const handleReviewRide = async (rideId: string, revieweeId: string) => {
    await reviewRide(rideId, revieweeId, reviewRating, reviewComment);
    setReviewingRideId(null);
    setReviewComment('');
    setReviewRating(5);
    alert("Merci pour votre avis !");
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

            {activeTab === 'offer' && (
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4 flex items-start gap-3">
                <Shield size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Par mesure de sécurité, votre trajet ne sera visible que par les étudiants de <strong>{user?.university || 'votre université'}</strong>.
                </p>
              </div>
            )}
            
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Type de véhicule</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setVehicleType('moto')}
                              className={cn(
                                "flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                vehicleType === 'moto' ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-white border-slate-200 text-slate-500"
                              )}
                            >
                              <Bike size={18} /> Moto
                            </button>
                            <button
                              type="button"
                              onClick={() => setVehicleType('car')}
                              className={cn(
                                "flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                vehicleType === 'car' ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-white border-slate-200 text-slate-500"
                              )}
                            >
                              <Car size={18} /> Voiture
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Immatriculation</label>
                          <input 
                            type="text" 
                            placeholder="Ex: 11 J 1234"
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                          />
                        </div>
                      </div>

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
                        placeholder="Modèle (ex: Yamaha Crypton)"
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
              
              {filteredRides.length > 0 ? filteredRides.map((ride) => {
                const driver = users?.find(u => u.id === ride.driverId);
                return (
                <div key={ride.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-orange-200 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <img src={ride.driverAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ride.driverName}`} alt={ride.driverName} className="w-12 h-12 rounded-full bg-slate-100" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{ride.driverName}</h4>
                          {driver?.isDriverVerified && (
                            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              <Shield size={10} /> VÉRIFIÉ
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span>{ride.driverRating.toFixed(1)}</span>
                          <span className="mx-1">•</span>
                          <span>{ride.motorcycle}</span>
                          {ride.university && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                <School size={10} />
                                {ride.university}
                              </span>
                            </>
                          )}
                        </div>
                        {ride.vehicleDetails?.plateNumber && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Immatriculation: {ride.vehicleDetails.plateNumber}
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

                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
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
                      className="flex-1 py-2.5 bg-orange-50 text-orange-700 font-bold rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors"
                    >
                      Réserver
                    </button>
                    {user?.id !== ride.driverId && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportingRideId(ride.id);
                        }}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Signaler"
                      >
                        <Flag size={18} />
                      </button>
                    )}
                  </div>

                  {/* Reporting UI */}
                  {reportingRideId === ride.id && (
                    <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 space-y-3">
                      <h5 className="text-xs font-bold text-red-700 uppercase">Signaler ce trajet / conducteur</h5>
                      <select 
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full p-2 text-sm bg-white border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      >
                        <option value="">Sélectionnez un motif</option>
                        <option value="comportement suspect">Comportement suspect</option>
                        <option value="arnaque">Arnaque</option>
                        <option value="harcèlement">Harcèlement</option>
                        <option value="fausse annonce">Fausse annonce</option>
                      </select>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleReportUser(ride.driverId, ride.id)}
                          className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
                        >
                          Confirmer le signalement
                        </button>
                        <button 
                          onClick={() => setReportingRideId(null)}
                          className="px-4 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Review UI (Simulated for completed rides) */}
                  {ride.status === 'completed' && !ride.passengers.includes(user?.id || '') && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewingRideId(ride.id);
                      }}
                      className="mt-3 w-full py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-100"
                    >
                      Laisser un avis sur ce trajet
                    </button>
                  )}

                  {reviewingRideId === ride.id && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
                      <h5 className="text-xs font-bold text-amber-700 uppercase">Votre avis</h5>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setReviewRating(star)}>
                            <Star size={20} className={cn(star <= reviewRating ? "text-amber-400 fill-amber-400" : "text-slate-300")} />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        placeholder="Votre commentaire..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full p-2 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 h-20"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleReviewRide(ride.id, ride.driverId)}
                          className="flex-1 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700"
                        >
                          Publier l'avis
                        </button>
                        <button 
                          onClick={() => setReviewingRideId(null)}
                          className="px-4 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
              }) : (
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
              Conseils de sécurité CampusBF
            </h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                <p>Vérifiez toujours le profil du conducteur ou passager.</p>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                <p>Rencontrez-vous dans un lieu public (campus).</p>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                <p>Informez un ami de votre trajet.</p>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                <p>Signalez tout comportement suspect immédiatement.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
