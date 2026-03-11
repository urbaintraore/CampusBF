import React, { useState } from 'react';
import { MapPin, Navigation, Clock, Users, Star, Shield, Search, Plus, Bike, CreditCard, ChevronRight, AlertCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import MotoMap from '@/components/MotoMap';

export default function MotoRide() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'offer'>('search');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  // Form states
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [time, setTime] = useState('');

  const mockRides = [
    {
      id: 'r1',
      driver: { name: 'Amadou K.', rating: 4.8, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amadou' },
      departure: 'Zogona',
      destination: 'Université Joseph Ki-Zerbo',
      time: '07:30',
      price: 300,
      distance: '2.5 km',
      motorcycle: 'Yamaha Sirius',
      helmetAvailable: true,
      lat: 12.3785,
      lng: -1.5120
    },
    {
      id: 'r2',
      driver: { name: 'Sarah T.', rating: 4.9, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
      departure: 'Patte d\'Oie',
      destination: 'ISIG',
      time: '08:00',
      price: 500,
      distance: '5.2 km',
      motorcycle: 'Honda 125',
      helmetAvailable: false,
      lat: 12.3350,
      lng: -1.5250
    }
  ];

  const mapRides = mockRides.map(ride => ({
    id: ride.id,
    lat: ride.lat,
    lng: ride.lng,
    driverName: ride.driver.name,
    destination: ride.destination
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
          {activeTab === 'offer' && user?.motoRideSubscriptionStatus !== 'active' ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bike size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Devenez Conducteur MotoRide</h2>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Pour proposer des trajets et rentabiliser vos déplacements, un abonnement de 2000 FCFA / mois est requis. Aucune commission ne sera prélevée sur vos trajets !
              </p>
              
              {user?.motoRideSubscriptionStatus === 'pending' ? (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl font-medium inline-flex items-center gap-2">
                  <Clock size={20} />
                  Votre paiement est en cours de validation par l'administrateur.
                </div>
              ) : (
                <button 
                  onClick={() => setShowSubscriptionModal(true)}
                  className="bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center gap-2 mx-auto"
                >
                  <Lock size={20} />
                  S'abonner pour 2000 FCFA / 30 jours
                </button>
              )}
            </div>
          ) : (
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="time" 
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>
                  {activeTab === 'offer' && (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">FCFA</span>
                      <input 
                        type="number" 
                        placeholder="Prix"
                        className="w-full pl-16 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                  )}
                </div>

                <button 
                  type="button"
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
          )}

          {/* Results Area (Only visible when searching) */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Trajets disponibles autour de vous</h3>
              
              {mockRides.map((ride) => (
                <div key={ride.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-orange-200 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <img src={ride.driver.avatar} alt={ride.driver.name} className="w-12 h-12 rounded-full bg-slate-100" />
                      <div>
                        <h4 className="font-bold text-slate-900">{ride.driver.name}</h4>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span>{ride.driver.rating}</span>
                          <span className="mx-1">•</span>
                          <span>{ride.motorcycle}</span>
                        </div>
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

                  <button className="w-full py-2.5 bg-orange-50 text-orange-700 font-bold rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    Réserver
                  </button>
                </div>
              ))}
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

      <ManualPaymentModal 
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        type="motoride"
        amount={2000}
        title="Abonnement Conducteur"
        description="Devenez conducteur MotoRide pendant 30 jours. Aucune commission sur vos trajets."
      />
    </div>
  );
}
