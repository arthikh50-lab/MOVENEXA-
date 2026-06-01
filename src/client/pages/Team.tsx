import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.js';
import { useAuth, User } from '../contexts/AuthContext.js';
import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Users, Trash2, Edit2, Shield, Search, Filter, MapPin, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiveMap from '../components/LiveMap.js';

export default function Team() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);

  const fetchTeam = async () => {
    if (!user?.companyId || user.role !== 'admin') return;
    try {
      setLoading(true);
      const q = query(
        collection(db, 'users'),
        where('companyId', '==', user.companyId)
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setTeamMembers(fetched);
    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [user?.companyId]);

  const removeUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this user? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      fetchTeam();
    } catch (error) {
      console.error("Error removing user:", error);
      alert("Failed to remove user.");
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      fetchTeam();
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update user role.");
    }
  };

  if (!user || user.role !== 'admin') {
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
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500 mt-1">Manage personnel, roles, and access across your organization.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
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
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">Loading team members...</td>
                </tr>
              ) : teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 flex flex-col items-center">
                    <Users className="w-12 h-12 text-slate-300 mb-3" />
                    <p>No team members found.</p>
                  </td>
                </tr>
              ) : (
                teamMembers.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          <p className="text-slate-500 text-xs">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {member.id === user.id ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          <Shield className="w-3.5 h-3.5" /> Admin (You)
                        </span>
                      ) : (
                        <select 
                          value={member.role}
                          onChange={(e) => changeRole(member.id, e.target.value)}
                          className={`px-3 py-1.5 border rounded-md text-sm font-medium outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 ${
                            member.role === 'admin' ? 'border-amber-200 bg-amber-50 text-amber-800' :
                            member.role === 'manager' ? 'border-blue-200 bg-blue-50 text-blue-800' :
                            'border-emerald-200 bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="driver">Driver</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 text-right">
                        {member.role === 'driver' && (
                          <button 
                            onClick={() => setSelectedDriver(member)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 border border-transparent hover:border-blue-200 transition"
                            title={`Locate ${member.name} on map`}
                          >
                            <MapPin className="w-3.5 h-3.5" /> Locate
                          </button>
                        )}
                        {member.id !== user.id && (
                          <button 
                            onClick={() => removeUser(member.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Remove User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDriver && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedDriver(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-200">
                  {selectedDriver.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Locating {selectedDriver.name}</h3>
                  <p className="text-sm border-slate-500 text-slate-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Tracking live status
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDriver(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 h-[60vh] md:h-[70vh]">
              <LiveMap companyId={user?.companyId} driverId={selectedDriver.id} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
