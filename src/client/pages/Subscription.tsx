import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertTriangle, Zap, Shield, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { auth } from '../config/firebase.js';
import Layout from '../components/Layout.js';

interface SubPlan {
  plan: string;
  status: string;
  expiryDate: string;
}

export default function Subscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch subscription');
      const data = await res.json();
      setSubscription(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    if (!user?.companyId) return;
    try {
      setActionLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: planName })
      });
      
      if (!res.ok) throw new Error('Upgrade failed');
      const data = await res.json();
      setSubscription(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isExpired = subscription ? new Date(subscription.expiryDate) < new Date() : false;
  
  const calculateDaysLeft = () => {
    if (!subscription || isExpired) return 0;
    const diffTime = Math.abs(new Date(subscription.expiryDate).getTime() - new Date().getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  const daysLeft = calculateDaysLeft();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Subscription Plan</h1>
            <p className="text-slate-500 mt-1 font-medium">Manage your organization's MoveNexa subscription</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-white ${isExpired ? 'bg-red-100/80 text-red-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'}`}>
                <CreditCard className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Current Plan</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{subscription?.plan || 'Unknown'}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isExpired ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                    {isExpired ? 'Expired' : 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 min-w-[200px]">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                {isExpired ? 'Expired Since' : 'Time Remaining'}
              </p>
              {isExpired ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                  <span className="text-2xl font-extrabold tracking-tight">Plan Expired</span>
                </div>
              ) : (
                <div className="flex items-end gap-2 text-slate-800">
                  <span className="text-4xl font-extrabold tracking-tight leading-none">{daysLeft}</span>
                  <span className="text-base font-medium text-slate-500 mb-1">days left</span>
                </div>
              )}
              <p className="text-xs text-slate-400 font-medium mt-2">
                Expires on {new Date(subscription?.expiryDate || '').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Basic Plan */}
          <div className={`bg-white/60 backdrop-blur-xl rounded-3xl p-8 border hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden ${subscription?.plan === 'Basic' ? 'border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500' : 'border-white/60 shadow-lg'}`}>
            {subscription?.plan === 'Basic' && (
               <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">Current</div>
            )}
            <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mb-6 border border-white shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Basic</h3>
            <p className="text-slate-500 font-medium text-sm mb-6 h-10">Essential tools for small local fleets.</p>
            <div className="text-4xl font-extrabold text-slate-900 tracking-tight mb-8">$29<span className="text-lg font-medium text-slate-500 ml-1">/mo</span></div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-700 font-medium">Up to 5 drivers</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-700 font-medium">Live Fleet Tracking</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-700 font-medium">Basic Analytics</span></li>
            </ul>
            
            <button 
              onClick={() => handleUpgrade('Basic')}
              disabled={actionLoading || subscription?.plan === 'Basic'}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all focus:ring-2 focus:ring-offset-2 ${subscription?.plan === 'Basic' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 focus:ring-blue-500 shadow-sm'}`}
            >
              {subscription?.plan === 'Basic' ? 'Current Plan' : 'Select Basic'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className={`bg-white/60 backdrop-blur-xl rounded-3xl p-8 border hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden ${subscription?.plan === 'Pro' ? 'border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500' : 'border-white/60 shadow-lg'}`}>
            {subscription?.plan === 'Pro' && (
               <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">Current</div>
            )}
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl"></div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-md border border-white">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Pro</h3>
            <p className="text-slate-500 font-medium text-sm mb-6 h-10">Advanced features for growing nationwide operations.</p>
            <div className="text-4xl font-extrabold text-slate-900 tracking-tight mb-8">$99<span className="text-lg font-medium text-slate-500 ml-1">/mo</span></div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-700 font-medium">Up to 25 drivers</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-700 font-medium">Live Fleet Tracking</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-700 font-medium">AI Stock Prediction</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-700 font-medium">Real-time Notifications</span></li>
            </ul>
            
            <button 
              onClick={() => handleUpgrade('Pro')}
              disabled={actionLoading || subscription?.plan === 'Pro'}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all focus:ring-2 focus:ring-offset-2 ${subscription?.plan === 'Pro' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg shadow-blue-500/20'}`}
            >
              {subscription?.plan === 'Pro' ? 'Current Plan' : 'Select Pro'}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className={`bg-slate-900 rounded-3xl p-8 border border-slate-700 hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden shadow-2xl`}>
            {subscription?.plan === 'Enterprise' && (
               <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">Current</div>
            )}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <div className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-slate-700">
              <Crown className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2">Enterprise</h3>
            <p className="text-slate-400 font-medium text-sm mb-6 h-10">Unlimited power and dedicated support for large fleets.</p>
            <div className="text-4xl font-extrabold text-white tracking-tight mb-8">$299<span className="text-lg font-medium text-slate-500 ml-1">/mo</span></div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-blue-400 shrink-0" /><span className="text-slate-300 font-medium">Unlimited drivers</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-blue-400 shrink-0" /><span className="text-slate-300 font-medium">Custom API Access</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-blue-400 shrink-0" /><span className="text-slate-300 font-medium">24/7 Priority Support</span></li>
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-blue-400 shrink-0" /><span className="text-slate-300 font-medium">Dedicated Account Manager</span></li>
            </ul>
            
            <button 
              onClick={() => handleUpgrade('Enterprise')}
              disabled={actionLoading || subscription?.plan === 'Enterprise'}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-slate-700 ${subscription?.plan === 'Enterprise' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg'}`}
            >
              {subscription?.plan === 'Enterprise' ? 'Current Plan' : 'Select Enterprise'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
