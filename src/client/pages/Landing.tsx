import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, Package, Users, Activity, 
  MapPin, Shield, ChevronRight, BarChart3,
  Globe2, Clock
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">M</div>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">MoveNexa</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/track" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Track</Link>
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Log In</Link>
              <Link to="/register" className="text-sm font-medium bg-blue-600 px-4 py-2 text-white rounded-lg hover:bg-blue-700 transition">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
          <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
          Next-generation Logistics Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
          Manage your fleet with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">precision.</span>
        </h1>
        <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          MoveNexa provides real-time visibility and control over your entire transport network. Shipments, drivers, and fleet management—all in one place.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="inline-flex justify-center items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            Start Free Trial
            <ChevronRight className="w-5 h-5" />
          </Link>
          <Link to="/track" className="inline-flex justify-center items-center gap-2 px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition shadow-sm">
            <Package className="w-5 h-5 text-blue-600" />
            Track a Shipment
          </Link>
        </div>

        {/* Browser Mockup */}
        <div className="mt-20 relative mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-2xl overflow-hidden relative">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              </div>
              <div className="mx-auto w-1/3 h-6 bg-white border border-slate-200 rounded text-xs flex items-center justify-center text-slate-400 font-mono">
                app.movenexa.com/dashboard
              </div>
            </div>
            
            {/* Fake Dashboard UI */}
            <div className="flex h-[500px]">
              {/* Sidebar */}
              <div className="w-48 bg-slate-50 border-r border-slate-100 p-4 space-y-2 hidden md:block">
                <div className="h-4 bg-slate-200 rounded w-2/3 mb-6"></div>
                <div className="h-8 bg-blue-100 rounded-lg w-full mb-2"></div>
                <div className="h-8 bg-slate-200 rounded-lg w-full"></div>
                <div className="h-8 bg-slate-200 rounded-lg w-full"></div>
              </div>
              {/* Main Content */}
              <div className="flex-1 p-6 bg-slate-100/50">
                <div className="flex justify-between items-center mb-6">
                  <div className="w-48 h-6 rounded bg-slate-200"></div>
                  <div className="w-24 h-8 rounded-lg bg-blue-600"></div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="h-24 bg-white border border-slate-100 rounded-xl p-4 shadow-sm"><div className="w-8 h-8 rounded bg-blue-100 mb-2"></div><div className="w-16 h-4 rounded bg-slate-200"></div></div>
                  <div className="h-24 bg-white border border-slate-100 rounded-xl p-4 shadow-sm"><div className="w-8 h-8 rounded bg-emerald-100 mb-2"></div><div className="w-16 h-4 rounded bg-slate-200"></div></div>
                  <div className="h-24 bg-white border border-slate-100 rounded-xl p-4 shadow-sm"><div className="w-8 h-8 rounded bg-amber-100 mb-2"></div><div className="w-16 h-4 rounded bg-slate-200"></div></div>
                </div>
                <div className="h-64 bg-white border border-slate-100 rounded-xl shadow-sm"></div>
              </div>
            </div>
            
            {/* Fade Out Gradient */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-slate-50 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Everything you need to scale</h2>
            <p className="mt-4 text-slate-600">Built for transport companies of all sizes, from local couriers to nationwide freight networks.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Package, title: 'Shipment Tracking', desc: 'Real-time visibility into every pallet, container, and parcel in your network.' },
              { icon: Truck, title: 'Fleet Management', desc: 'Assign drivers, monitor vehicle status, and handle maintenance schedules.' },
              { icon: Users, title: 'Role-Based Access', desc: 'Dedicated views to help Admins, Managers, and Drivers work effectively.' },
              { icon: BarChart3, title: 'Analytics & Insights', desc: 'Detailed reporting on delivery times, cost tracking, and operational efficiency.' },
              { icon: Globe2, title: 'Route Optimization', desc: 'Intelligent routing features to save fuel and reduce turnaround times.' },
              { icon: Shield, title: 'Secure & Compliant', desc: 'Enterprise-grade security built on top of robust cloud infrastructure.' }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-md transition group">
                <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-blue-200 group-hover:text-blue-600 transition">
                  <feature.icon className="w-6 h-6 text-slate-700 group-hover:text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Action Banner */}
      <section className="bg-blue-600 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to streamline your operations?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">Join hundreds of logistics companies optimizing their fleet with MoveNexa today.</p>
          <Link to="/register" className="inline-flex justify-center items-center px-8 py-3.5 bg-white text-blue-600 rounded-xl font-bold hover:bg-slate-50 transition shadow-xl">
            Create an Account Now
          </Link>
        </div>
      </section>
      
      <footer className="py-8 text-center text-slate-500 bg-slate-50 border-t border-slate-200 text-sm">
        <p>&copy; {new Date().getFullYear()} MoveNexa. All rights reserved.</p>
      </footer>
    </div>
  );
}
