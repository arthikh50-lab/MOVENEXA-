import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.js';
import { useAuth, User } from '../contexts/AuthContext.js';
import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Truck, Plus, XCircle, Search, User as UserIcon, Trash2 } from 'lucide-react';

interface Vehicle {
  id: string;
  plateNumber: string;
  type: string;
  capacity: number;
  assignedDriverId: string | null;
  status: 'active' | 'maintenance' | 'inactive';
  companyId: string;
}

export default function Fleet() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState('truck');
  const [capacity, setCapacity] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');

  const fetchData = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      // Fetch vehicles
      const vQuery = query(collection(db, 'vehicles'), where('companyId', '==', user.companyId));
      const vSnap = await getDocs(vQuery);
      const fetchedVehicles = vSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
      
      // Fetch drivers
      const dQuery = query(collection(db, 'users'), where('companyId', '==', user.companyId));
      const dSnap = await getDocs(dQuery);
      const fetchedDrivers = dSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => d.role === 'driver') as User[];

      setVehicles(fetchedVehicles);
      setDrivers(fetchedDrivers);
    } catch (error) {
      console.error("Error fetching fleet data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.companyId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    setIsSubmitting(true);
    
    try {
      const newVehicle = {
        plateNumber: plateNumber.toUpperCase(),
        type,
        capacity: Number(capacity),
        assignedDriverId: assignedDriverId || null,
        status: 'active',
        companyId: user.companyId,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'vehicles'), newVehicle);
      
      setIsModalOpen(false);
      setPlateNumber('');
      setType('truck');
      setCapacity('');
      setAssignedDriverId('');
      fetchData();
    } catch (error) {
      console.error("Error creating vehicle:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignDriver = async (vehicleId: string, driverId: string) => {
    try {
      await updateDoc(doc(db, 'vehicles', vehicleId), {
        assignedDriverId: driverId === 'none' ? null : driverId
      });
      fetchData();
    } catch (error) {
      console.error("Error assigning driver:", error);
    }
  };

  const removeVehicle = async (vehicleId: string) => {
    if(!window.confirm("Are you sure you want to remove this vehicle?")) return;
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      fetchData();
    } catch (error) {
      console.error("Error removing vehicle:", error);
    }
  }

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return 'Unassigned';
    return drivers.find(d => d.id === driverId)?.name || 'Unknown Driver';
  };

  if (!user || user.role === 'driver') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-500">You do not have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
          <p className="text-slate-500 mt-1">Manage vehicles and assign drivers.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search vehicles..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Capacity</th>
                <th className="px-6 py-4">Assigned Driver</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading fleet...</td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 flex flex-col items-center">
                    <Truck className="w-12 h-12 text-slate-300 mb-3" />
                    <p>No vehicles found.</p>
                  </td>
                </tr>
              ) : (
                vehicles.map(vehicle => (
                  <tr key={vehicle.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{vehicle.plateNumber}</p>
                          <p className="text-slate-500 text-xs capitalize">{vehicle.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {vehicle.capacity} kg
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select 
                          value={vehicle.assignedDriverId || 'none'}
                          onChange={(e) => assignDriver(vehicle.id, e.target.value)}
                          className={`px-3 py-1.5 border rounded-md text-sm font-medium outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 ${vehicle.assignedDriverId ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600'}`}
                        >
                          <option value="none">Unassigned</option>
                          {drivers.map(driver => (
                            <option key={driver.id} value={driver.id}>{driver.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${vehicle.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                          onClick={() => removeVehicle(vehicle.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove Vehicle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Add New Vehicle</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plate Number</label>
                <input 
                  type="text" required value={plateNumber} onChange={e => setPlateNumber(e.target.value)}
                  placeholder="e.g. ABC-1234"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    value={type} onChange={e => setType(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="pickup">Pickup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Capacity (kg)</label>
                  <input 
                    type="number" required min="1" value={capacity} onChange={e => setCapacity(e.target.value)}
                    placeholder="5000"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Driver (Optional)</label>
                <select 
                  value={assignedDriverId} onChange={e => setAssignedDriverId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Leave Unassigned</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                  ))}
                </select>
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
                  {isSubmitting ? 'Adding...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
