import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.js';
import { useAuth } from '../contexts/AuthContext.js';
import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { Package, Plus, MapPin, Truck, CheckCircle, Clock, XCircle, Search, Filter } from 'lucide-react';
import { auth } from '../config/firebase.js';

interface Shipment {
  id: string;
  trackingId: string;
  origin: string;
  destination: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'cancelled';
  weight: number;
  products: string;
  eta: string;
  createdAt: string;
  companyId: string;
  assignedDriverId?: string | null;
  statusHistory?: { status: string; timestamp: string; location?: string }[];
}

const tryGetLocation = async (): Promise<string> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve('Location unavailable');
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`),
      () => resolve('Location unavailable'),
      { timeout: 5000 }
    );
  });
};

export default function Shipments() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Form State
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState('');
  const [products, setProducts] = useState('');
  const [eta, setEta] = useState('');

  useEffect(() => {
    if (!user?.companyId) return;

    setLoading(true);

    const q = query(
      collection(db, 'shipments'),
      where('companyId', '==', user.companyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Shipment[];
      
      if (user.role === 'driver') {
        fetched = fetched.filter(doc => doc.assignedDriverId === user.id);
      }
      
      // Sort client side instead of using orderBy to avoid index requirement
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setShipments(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching shipments:", error);
      setLoading(false);
    });

    const dQuery = query(collection(db, 'users'), where('companyId', '==', user.companyId));
    getDocs(dQuery).then((dSnap) => {
      const allUsers = dSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const driversOnly = allUsers.filter(u => u.role === 'driver');
      setDrivers(driversOnly.map(d => ({ id: d.id, name: d.name })));
    }).catch(console.error);

    return () => unsubscribe();
  }, [user?.companyId, user?.id, user?.role]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    setIsSubmitting(true);
    
    try {
      const newShipment = {
        trackingId: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
        origin,
        destination,
        status: 'pending',
        weight: Number(weight),
        products: products,
        eta: eta,
        createdAt: new Date().toISOString(),
        companyId: user.companyId,
        createdBy: user.id
      };

      const newShipmentRef = await addDoc(collection(db, 'shipments'), newShipment);
      
      // Emit new order notification
      const currentUser = auth.currentUser;
      if (currentUser && user?.companyId) {
        const token = await currentUser.getIdToken();
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            companyId: user.companyId,
            title: 'New Dispatch Order',
            message: `A new shipment was created from ${origin} to ${destination}.`,
            type: 'new_order'
          })
        });
      }

      // Close and reset
      setIsModalOpen(false);
      setOrigin('');
      setDestination('');
      setWeight('');
      setProducts('');
      setEta('');
    } catch (error) {
      console.error("Error creating shipment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (shipmentId: string, newStatus: string) => {
    try {
      const locationStr = await tryGetLocation();
      await updateDoc(doc(db, 'shipments', shipmentId), {
        status: newStatus,
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: new Date().toISOString(),
          location: locationStr
        })
      });

      // Send notification
      const currentUser = auth.currentUser;
      if (currentUser && user?.companyId) {
        const token = await currentUser.getIdToken();
        const notificationType = newStatus === 'delivered' ? 'delivery_complete' : 'status_update';
        const title = newStatus === 'delivered' ? 'Delivery Completed' : 'Shipment Status Updated';
        const message = `Shipment ${shipmentId.slice(-6).toUpperCase()} is now ${newStatus.replace('-', ' ')}.`;
        
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            companyId: user.companyId,
            title,
            message,
            type: notificationType
          })
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const assignDriver = async (shipmentId: string, driverId: string) => {
    try {
      await updateDoc(doc(db, 'shipments', shipmentId), {
        assignedDriverId: driverId === 'none' ? null : driverId
      });
    } catch (error) {
      console.error("Error assigning driver:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'in-transit': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Truck className="w-3.5 h-3.5" /> In Transit</span>;
      case 'delivered': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Delivered</span>;
      case 'cancelled': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default: return null;
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipments</h1>
          <p className="text-slate-500 mt-1">Manage all organization shipments and deliveries.</p>
        </div>
        {(user.role === 'admin' || user.role === 'manager') && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Shipment
          </button>
        )}
      </div>

      {isOffline && (
        <div className="mb-8 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-amber-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700 font-medium">
                You are currently offline. Changes will be saved locally and synced automatically when your connection is restored.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* List / Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search tracking ID or location..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Tracking ID</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Status</th>
                {user.role !== 'driver' && <th className="px-6 py-4">Driver</th>}
                <th className="px-6 py-4">Created Date</th>
                {user.role !== 'driver' && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading shipments...</td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 flex flex-col items-center">
                    <Package className="w-12 h-12 text-slate-300 mb-3" />
                    <p>No shipments found.</p>
                  </td>
                </tr>
              ) : (
                shipments.map(shipment => (
                  <tr key={shipment.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedShipment(shipment)}
                        className="font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer select-none"
                      >
                        {shipment.trackingId}
                      </button>
                    </td>
                    <td className="px-6 py-4 min-w-[260px]">
                      <div className="flex flex-col gap-1.5 w-full max-w-[300px]">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-800 truncate pr-2" title={shipment.origin}>{shipment.origin}</span>
                          <span className="font-bold text-slate-800 truncate pl-2 text-right" title={shipment.destination}>{shipment.destination}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 relative overflow-visible flex items-center shadow-inner mt-1 mb-1">
                          <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out flex justify-end items-center ${
                              shipment.status === 'delivered' ? 'w-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                              shipment.status === 'in-transit' ? 'w-1/2 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                              shipment.status === 'cancelled' ? 'w-full bg-red-500' : 'w-0 bg-transparent'
                          }`}>
                            {shipment.status === 'in-transit' && (
                              <>
                                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md border-[1.5px] border-blue-500 flex items-center justify-center z-10">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-bold text-slate-400">
                          <span>Origin</span>
                          <span>Destination</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {shipment.weight} kg • {shipment.products}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(shipment.status)}
                    </td>
                    {user.role !== 'driver' && (
                      <td className="px-6 py-4">
                        <select 
                          value={shipment.assignedDriverId || 'none'}
                          onChange={(e) => assignDriver(shipment.id, e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-md text-sm outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 max-w-[120px]"
                        >
                          <option value="none">Unassigned</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(shipment.createdAt).toLocaleDateString()}
                    </td>
                    {user.role !== 'driver' && (
                      <td className="px-6 py-4 text-right">
                        <select 
                          value={shipment.status}
                          onChange={(e) => updateStatus(shipment.id, e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="in-transit">In Transit</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Shipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Create New Shipment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Origin Location</label>
                <input 
                  type="text" required value={origin} onChange={e => setOrigin(e.target.value)}
                  placeholder="e.g. Warehouse A, New York"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                <input 
                  type="text" required value={destination} onChange={e => setDestination(e.target.value)}
                  placeholder="e.g. Retail Store #402, Chicago"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
                  <input 
                    type="number" required min="1" value={weight} onChange={e => setWeight(e.target.value)}
                    placeholder="1000"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Products</label>
                  <input 
                    type="text" required value={products} onChange={e => setProducts(e.target.value)}
                    placeholder="e.g. 10x Laptops, 5x Monitors"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery (ETA)</label>
                 <input 
                   type="datetime-local" required value={eta} onChange={e => setEta(e.target.value)}
                   className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                 />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipment Details Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Shipment Details</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">{selectedShipment.trackingId}</p>
              </div>
              <button onClick={() => setSelectedShipment(null)} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('info')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Route History
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {activeTab === 'info' && (
                <div className="space-y-6 flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Origin</p>
                      <p className="text-slate-900 font-medium">{selectedShipment.origin}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Destination</p>
                      <p className="text-slate-900 font-medium">{selectedShipment.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                      <div>{getStatusBadge(selectedShipment.status)}</div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ETA</p>
                      <p className="text-slate-900 font-medium">{selectedShipment.eta ? new Date(selectedShipment.eta).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Products</p>
                      <p className="text-slate-900 font-medium">{selectedShipment.products}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Weight</p>
                      <p className="text-slate-900 font-medium">{selectedShipment.weight} kg</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6 flex-1">
                  {(!selectedShipment.statusHistory || selectedShipment.statusHistory.length === 0) ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-slate-500">No route history available yet.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 my-4 ml-2">
                       {selectedShipment.statusHistory.map((item, idx) => (
                         <div className="relative" key={idx}>
                           <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white"></span>
                           <p className="text-sm font-bold text-slate-900 capitalize mb-0.5">{item.status.replace('-', ' ')}</p>
                           <p className="text-xs font-medium text-slate-500 mb-1">{new Date(item.timestamp).toLocaleString()}</p>
                           {item.location && (
                             <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-2 bg-slate-50 inline-block px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">
                               <MapPin className="w-3.5 h-3.5 text-slate-400" /> 
                               {item.location}
                             </p>
                           )}
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button 
                onClick={() => setSelectedShipment(null)}
                className="px-5 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
