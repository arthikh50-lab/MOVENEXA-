import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { Search, Package, MapPin, Truck, CheckCircle, Clock, Calendar, Info } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import LiveMap from '../components/LiveMap.js';
import { io, Socket } from 'socket.io-client';

export default function Track() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState(id || '');
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveDistance, setLiveDistance] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (id) {
      setTrackingId(id);
      fetchShipment(id);
    }
  }, [id]);

  useEffect(() => {
    if (shipment?.id && shipment.status === 'in-transit') {
      socketRef.current = io(window.location.origin);
      
      socketRef.current.on(`locationUpdate_shipment_${shipment.id}`, (data: { coords: { lat: number, lng: number } }) => {
        setShipment((prev: any) => ({ ...prev, driverLocation: data.coords }));
      });
      
      socketRef.current.on(`etaUpdate_${shipment.id}`, (data: { eta: string, distance: string }) => {
        setShipment((prev: any) => ({ ...prev, eta: data.eta }));
        setLiveDistance(data.distance);
      });

      return () => {
        if (socketRef.current) socketRef.current.disconnect();
      };
    }
  }, [shipment?.id, shipment?.status]);

  const fetchShipment = async (tid: string) => {
    if (!tid.trim()) return;

    setLoading(true);
    setError('');
    setShipment(null);

    try {
      const q = query(collection(db, 'shipments'), where('trackingId', '==', tid.toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setError('No shipment found with this Tracking ID.');
      } else {
        setShipment({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching tracking details.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingId.trim()) {
      navigate(`/track/${trackingId.toUpperCase()}`);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'pending': return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Pending' };
      case 'in-transit': return { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Transit' };
      case 'delivered': return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Delivered' };
      default: return { icon: Package, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Unknown' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">M</div>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">MoveNexa</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Log In</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-xl w-full text-center space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Track your shipment</h1>
            <p className="text-slate-500 mt-2">Enter your tracking number to get real-time tracking updates.</p>
          </div>

          <form onSubmit={handleTrack} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -mt-2.5 text-slate-400" />
              <input 
                type="text" 
                value={trackingId}
                onChange={e => setTrackingId(e.target.value)}
                placeholder="e.g. TRK-123456"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg uppercase shadow-sm"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {shipment && (
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 text-left relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                  <Package className="w-24 h-24 text-slate-50 -mr-6 -mt-6" />
               </div>
               
               {(()=>{
                  const statusInfo = getStatusDisplay(shipment.status);
                  const Icon = statusInfo.icon;
                  return (
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500 font-medium tracking-wide uppercase">Tracking Number</p>
                          <p className="text-xl font-bold text-slate-900">{shipment.trackingId}</p>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusInfo.bg} ${statusInfo.color} font-bold text-sm`}>
                          <Icon className="w-4 h-4" />
                          {statusInfo.label}
                        </div>
                      </div>

                      <div className="h-48 sm:h-64 mt-4 w-full">
                        <LiveMap 
                          origin={shipment.origin} 
                          destination={shipment.destination} 
                          driverLocation={shipment.driverLocation} 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6 relative mt-4">
                        <div className="col-span-1">
                          <p className="text-sm text-slate-500 font-medium mb-1">Origin</p>
                          <p className="font-semibold text-slate-900 flex flex-col">
                            {shipment.origin}
                          </p>
                        </div>
                        
                        <div className="col-span-1">
                          <p className="text-sm text-slate-500 font-medium mb-1">Destination</p>
                          <p className="font-semibold text-slate-900 flex flex-col">
                             {shipment.destination}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center mt-6 border border-slate-100 flex-wrap gap-4">
                         <div>
                           <p className="text-xs text-slate-500 font-medium mb-1">Weight</p>
                           <p className="font-semibold text-slate-700">{shipment.weight} kg</p>
                         </div>
                         <div className="hidden sm:block h-8 w-px bg-slate-200"></div>
                         <div>
                           <p className="text-xs text-slate-500 font-medium mb-1">Items</p>
                           <p className="font-semibold text-slate-700">{shipment.products || shipment.pallets + ' pallets'}</p>
                         </div>
                         <div className="hidden sm:block h-8 w-px bg-slate-200"></div>
                         <div>
                           <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> ETA</p>
                           <p className="font-semibold text-slate-700">
                             {shipment.eta ? new Date(shipment.eta).toLocaleString() : 'Not specified'}
                           </p>
                           {liveDistance && (
                             <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1" title="Formula: Distance (km) / Assumed average speed (40 km/h)">
                               <Info className="w-3 h-3" />
                               {liveDistance} km away
                             </p>
                           )}
                         </div>
                      </div>
                    </div>
                  );
               })()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
