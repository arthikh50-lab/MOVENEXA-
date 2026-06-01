import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { 
  LogOut, Users, Truck, Package, Shield, 
  Map, ExternalLink,
  Activity, DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase.js';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, arrayUnion } from 'firebase/firestore';
import Layout from '../components/Layout.js';
import LiveMap from '../components/LiveMap.js';
import { io, Socket } from 'socket.io-client';

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

function AIPredictionPanel({ companyId }: { companyId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handlePredict = async () => {
    setLoading(true);
    setError('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      const token = await currentUser.getIdToken();
      
      const res = await fetch(`/api/analytics/predict-low-stock?companyId=${companyId}&currentInventory=5000`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        auth.signOut();
        window.location.href = '/login';
        return;
      }
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 p-6 sm:p-8 mt-6 overflow-hidden relative group">
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
      
      <div className="flex items-center justify-between mb-8 relative z-10 border-b border-white/40 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-indigo-600" />
          <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">AI Stock Prediction</h3>
        </div>
        <button 
          onClick={handlePredict} 
          disabled={loading}
          className="bg-indigo-50/80 backdrop-blur-sm text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-100 transition disabled:opacity-50 border border-indigo-200/50 shadow-sm"
        >
          {loading ? 'Analyzing...' : 'Run Prediction'}
        </button>
      </div>

      {error && <div className="text-red-500 text-sm mb-4 relative z-10">{error}</div>}

      {data ? (
        <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border border-white shadow-sm relative z-10 transition-all">
          <div className="flex justify-between items-start mb-8 border-b border-slate-200/50 pb-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Status</p>
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border ${data.alertTriggered ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {data.alertTriggered ? 'Critical Low Stock' : 'Stock Levels Optimal'}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Days Remaining</p>
              <p className={`text-4xl font-extrabold tracking-tight ${data.alertTriggered ? 'text-red-600' : 'text-slate-800'}`}>
                {data.predictedDaysRemaining.toFixed(0)} <span className="text-lg font-medium text-slate-500">days</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white/60 rounded-xl p-5 border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">30-Day Usage</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{data.last30DaysUsage.toFixed(0)} kg</p>
            </div>
            <div className="bg-white/60 rounded-xl p-5 border border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Daily Average</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{data.dailyAverage.toFixed(1)} kg</p>
            </div>
          </div>
          
          <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100/50 text-slate-700 font-medium leading-relaxed shadow-inner">
            "{data.stockLevelAssessment}"
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 border-2 border-dashed border-white/60 rounded-2xl bg-white/30 backdrop-blur-sm relative z-10">
          <Activity className="w-10 h-10 text-indigo-300 mx-auto mb-4" />
          <p className="text-base font-medium text-slate-600">Click 'Run Prediction' to analyze your recent tracking data</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, trend }: { title: string, value: string, change: string, icon: any, trend: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-6 relative overflow-hidden group hover:bg-white/80 transition-all duration-300">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        </div>
        <div className="p-3 bg-white/80 shadow-sm text-blue-600 rounded-2xl border border-white">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm relative z-10">
        <span className={`font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-600'}`}>
          {change}
        </span>
        <span className="text-slate-500 ml-2">Real-time</span>
      </div>
    </div>
  );
}

function AdminPanel() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('manager');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState({ totalShipments: 0, activeDrivers: 0, pendingOrders: 0 });

  useEffect(() => {
    if (!user?.companyId) return;

    const shipmentsQuery = query(
      collection(db, 'shipments'),
      where('companyId', '==', user.companyId)
    );

    const driversQuery = query(
      collection(db, 'users'),
      where('companyId', '==', user.companyId)
    );

    const unsubShipments = onSnapshot(shipmentsQuery, (snapshot) => {
      let pending = 0;
      snapshot.forEach(doc => {
        if (doc.data().status === 'pending') pending++;
      });
      setStats(s => ({ ...s, totalShipments: snapshot.size, pendingOrders: pending }));
    }, (error) => console.error("Admin shipments query error:", error));

    const unsubDrivers = onSnapshot(driversQuery, (snapshot) => {
      let drivers = 0;
      snapshot.forEach(doc => {
        if (doc.data().role === 'driver') drivers++;
      });
      setStats(s => ({ ...s, activeDrivers: drivers }));
    }, (error) => console.error("Admin drivers query error:", error));

    return () => {
      unsubShipments();
      unsubDrivers();
    };
  }, [user?.companyId]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setMessage('');
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      const token = await currentUser.getIdToken();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Successfully created ${role} account for ${name}`);
      setName(''); setEmail(''); setPassword('');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Shipments" value={stats.totalShipments.toString()} change="" icon={Package} trend="neutral" />
        <StatCard title="Active Drivers" value={stats.activeDrivers.toString()} change="" icon={Users} trend="neutral" />
        <StatCard title="Pending Orders" value={stats.pendingOrders.toString()} change="" icon={Activity} trend="neutral" />
        <StatCard title="Revenue" value="---" change="" icon={DollarSign} trend="neutral" />
      </div>

      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/40">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Admin Controls</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-base font-bold text-slate-700 mb-4">Create New Personnel</h3>
            {message && <div className="mb-4 p-3 rounded-lg bg-blue-50/80 backdrop-blur-sm text-blue-700 text-sm border border-blue-200">{message}</div>}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input
                type="text" required placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <input
                type="email" required placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <input
                type="password" required placeholder="Temporary Password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <select
                value={role} onChange={e => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              >
                <option value="manager">Transport Manager</option>
                <option value="driver">Driver</option>
              </select>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20">
                Create Account
              </button>
            </form>
          </div>
          
          <div className="bg-white/40 backdrop-blur-sm p-8 rounded-2xl border border-white/60 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h4 className="font-extrabold text-slate-900 mb-3 text-lg">Personnel Management</h4>
            <p className="text-slate-500 leading-relaxed font-medium">As an Admin, you have global access to create and manage managers and drivers for your organization securely.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagerPanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ activeRoutes: 0, availableDrivers: 0, pendingShipments: 0 });

  useEffect(() => {
    if (!user?.companyId) return;

    const shipmentsQuery = query(
      collection(db, 'shipments'),
      where('companyId', '==', user.companyId)
    );

    const driversQuery = query(
      collection(db, 'users'),
      where('companyId', '==', user.companyId)
    );

    const unsubShipments = onSnapshot(shipmentsQuery, (snapshot) => {
      let inTransit = 0;
      let pending = 0;
      snapshot.forEach(doc => {
        const status = doc.data().status;
        if (status === 'in-transit') inTransit++;
        if (status === 'pending') pending++;
      });
      setStats(s => ({ ...s, activeRoutes: inTransit, pendingShipments: pending }));
    }, (error) => console.error("Manager shipments query error:", error));

    const unsubDrivers = onSnapshot(driversQuery, (snapshot) => {
      let drivers = 0;
      snapshot.forEach(doc => {
        if (doc.data().role === 'driver') drivers++;
      });
      setStats(s => ({ ...s, availableDrivers: drivers }));
    }, (error) => console.error("Manager drivers query error:", error));

    return () => {
      unsubShipments();
      unsubDrivers();
    };
  }, [user?.companyId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Active Routes" value={stats.activeRoutes.toString()} change="" icon={Map} trend="neutral" />
        <StatCard title="Total Drivers" value={stats.availableDrivers.toString()} change="" icon={Users} trend="neutral" />
        <StatCard title="Pending Shipments" value={stats.pendingShipments.toString()} change="" icon={Package} trend="neutral" />
      </div>

      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 p-6 sm:p-8">
        <h3 className="font-extrabold text-slate-900 text-xl tracking-tight mb-6">Live Fleet Tracking</h3>
        <div className="w-full h-[32rem] rounded-2xl overflow-hidden shadow-inner border border-white/50 bg-slate-50/50">
           <LiveMap companyId={user?.companyId} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 border border-white/60 hover:border-blue-300 transition cursor-pointer group hover:bg-white/80">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm"><Truck className="w-6 h-6" /></div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Manage Fleet</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Assign drivers to routes, monitor vehicle status, and handle dispatch operations.</p>
            </div>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 border border-white/60 hover:border-blue-300 transition cursor-pointer group hover:bg-white/80">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm"><Package className="w-6 h-6" /></div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Active Shipments</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Track ongoing deliveries, manage logistics routes, and handle exceptions.</p>
            </div>
          </div>
        </div>
      </div>
      
      {user?.companyId && <AIPredictionPanel companyId={user.companyId} />}
    </div>
  );
}

function DriverPanel() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const socketRef = useRef<Socket | null>(null);
  const lastDbUpdateTime = useRef<number>(0);

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

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    const q = query(
      collection(db, 'shipments'),
      where('companyId', '==', user.companyId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((doc: any) => doc.assignedDriverId === user.id);
      setShipments(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching driver shipments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id, user?.companyId]);

  const activeShipment = shipments.find(s => s.status === 'in-transit');
  const pendingShipments = shipments.filter(s => s.status === 'pending');

  useEffect(() => {
    if (!activeShipment || activeShipment.status !== 'in-transit' || !user?.companyId) return;

    // Connect to websocket
    socketRef.current = io(window.location.origin);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (socketRef.current) {
          socketRef.current.emit('driverLocationUpdate', {
            shipmentId: activeShipment.id,
            companyId: user.companyId,
            coords: { lat: latitude, lng: longitude },
            destination: activeShipment.destination
          });
        }

        // Background sync that updates the latitude and longitude in the Shipments table every 30 seconds
        const now = Date.now();
        if (now - lastDbUpdateTime.current > 30000) {
          lastDbUpdateTime.current = now;
          updateDoc(doc(db, 'shipments', activeShipment.id), {
            driverLocation: { lat: latitude, lng: longitude }
          }).catch(err => console.error("Background sync error:", err));
        }
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [activeShipment?.id, activeShipment?.status, user?.companyId]);

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

  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <Activity className="h-5 w-5 text-amber-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700 font-medium">
                You are currently offline. Background tracking and status updates will be queued and synchronized automatically when your connection is restored.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Driver Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Deliveries" value={shipments.filter(s => s.status === 'delivered').length.toString()} change="" icon={Package} trend="neutral" />
        <StatCard title="Pending" value={pendingShipments.length.toString()} change="" icon={Activity} trend="neutral" />
        <StatCard title="Active Route" value={activeShipment ? '1' : '0'} change="" icon={Map} trend="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden border border-white/60">
            <div className="p-6 sm:px-8 sm:pt-8 border-b border-white/40 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Current Assignment</h3>
              {activeShipment ? (
                <span className={`px-4 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider shadow-sm ${activeShipment.status === 'in-transit' ? 'bg-blue-100/80 text-blue-800 border border-blue-200/50' : 'bg-amber-100/80 text-amber-800 border border-amber-200/50'}`}>
                  {activeShipment.status.replace('-', ' ')}
                </span>
              ) : (
                  <span className="px-4 py-1.5 bg-slate-100/80 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wider shadow-sm border border-slate-200/50">No Active Assignment</span>
              )}
            </div>
            
            {activeShipment ? (
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4 p-5 bg-white/70 backdrop-blur-sm rounded-2xl border border-white mb-8 shadow-sm">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-inner flex items-center justify-center border border-white">
                      <Package className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                      <p className="font-bold text-slate-900 text-lg tracking-tight">Tracking: {activeShipment.trackingId}</p>
                      <p className="text-sm font-medium text-slate-500">{activeShipment.products || activeShipment.pallets + ' pallets'} • {activeShipment.weight} kg</p>
                  </div>
                </div>

                <div className="h-48 sm:h-72 mb-8 relative w-full rounded-2xl overflow-hidden shadow-inner border border-white/50">
                  <LiveMap 
                    origin={activeShipment.origin} 
                    destination={activeShipment.destination}
                    driverLocation={activeShipment.driverLocation}
                  />
                </div>

                <div className="mb-8">
                  <div className="flex justify-between items-end mb-3">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-base font-bold text-slate-900 truncate" title={activeShipment.origin}>{activeShipment.origin}</p>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Origin</p>
                    </div>
                    <div className="flex-1 min-w-0 pl-4 text-right">
                      <p className="text-base font-bold text-slate-900 truncate" title={activeShipment.destination}>{activeShipment.destination}</p>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Destination</p>
                    </div>
                  </div>
                  <div className="relative w-full h-3 bg-slate-100 rounded-full shadow-inner flex items-center">
                    <div className={`absolute left-0 h-full rounded-full transition-all duration-1000 ${
                        activeShipment.status === 'delivered' ? 'w-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                        activeShipment.status === 'in-transit' ? 'w-1/2 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'w-0'
                      }`}>
                    </div>
                    {activeShipment.status === 'in-transit' && (
                        <div className="absolute left-0 w-1/2 h-full z-10 flex justify-end items-center">
                          <div className="w-full h-full bg-white/20 animate-pulse rounded-full absolute top-0 left-0"></div>
                          <div className="translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-md border-2 border-blue-500 flex items-center justify-center relative">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                          </div>
                        </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 flex gap-3">
                  {activeShipment.status === 'in-transit' && (
                    <button 
                      onClick={() => updateStatus(activeShipment.id, 'delivered')}
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-bold text-base hover:from-emerald-600 hover:to-emerald-700 transition shadow-lg shadow-emerald-500/20"
                    >
                      End Delivery
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-24 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="w-24 h-24 bg-gradient-to-br from-white to-slate-50 rounded-full shadow-lg border border-white flex items-center justify-center relative z-10">
                    <Truck className="w-10 h-10 text-slate-400" />
                  </div>
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">No Active Deliveries</h4>
                <p className="text-slate-500 font-medium max-w-sm">You currently do not have any deliveries in transit. Please start an assignment from your pending list.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/60 p-6 sm:p-8">
              <h3 className="font-extrabold text-slate-900 mb-6 tracking-tight text-lg">Pending Assignments</h3>
              <div className="space-y-4">
                {pendingShipments.map(s => (
                  <div key={s.id} className="text-sm border border-slate-200/60 rounded-2xl p-4 bg-white/70 shadow-sm flex flex-col gap-4 transition hover:bg-white/90">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <p className="font-bold text-slate-900 truncate pr-2" title={s.origin}>{s.origin}</p>
                        <p className="font-bold text-slate-900 truncate pl-2 text-right" title={s.destination}>{s.destination}</p>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2 relative">
                        <div className="absolute left-0 h-full bg-slate-300 w-0"></div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-3">
                        <span>Origin</span>
                        <span>Destination</span>
                      </div>
                      <p className="text-slate-500 font-medium text-xs">{s.trackingId}</p>
                    </div>
                    <button 
                      onClick={() => updateStatus(s.id, 'in-transit')}
                      className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition text-center shadow-md shadow-slate-900/10 uppercase tracking-widest"
                    >
                      Start Delivery
                    </button>
                  </div>
                ))}
                {pendingShipments.length === 0 && (
                  <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center">
                    <Package className="w-6 h-6 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-500">No pending assignments.</p>
                  </div>
                )}
              </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/60 p-6 sm:p-8">
              <h3 className="font-extrabold text-slate-900 mb-6 tracking-tight text-lg">Your Recent Deliveries</h3>
              <div className="space-y-4">
                {shipments.filter(s => s.status === 'delivered').slice(0, 3).map(s => (
                  <div key={s.id} className="text-sm p-4 border border-slate-100 rounded-xl bg-white/50 space-y-2">
                    <div className="flex justify-between items-center text-slate-900 font-bold mb-1.5">
                      <span className="truncate pr-2" title={s.origin}>{s.origin}</span>
                      <span className="truncate pl-2 text-right" title={s.destination}>{s.destination}</span>
                    </div>
                    <div className="w-full h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                    <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-bold text-slate-400">
                      <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                      <span className="text-emerald-600">Delivered</span>
                    </div>
                  </div>
                ))}
                {shipments.filter(s => s.status === 'delivered').length === 0 && (
                  <p className="text-sm font-medium text-slate-500 text-center py-4">No recent deliveries.</p>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="text-slate-500 mt-1">Here is what is happening across your fleet today.</p>
        </div>
        <button 
          onClick={() => { logout(); navigate('/login'); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {user.role === 'admin' && <AdminPanel />}
      {user.role === 'manager' && <ManagerPanel />}
      {user.role === 'driver' && <DriverPanel />}
    </Layout>
  );
}

