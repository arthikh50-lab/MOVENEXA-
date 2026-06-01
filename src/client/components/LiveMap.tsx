import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, TrafficLayer } from '@react-google-maps/api';
import { db } from '../config/firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Navigation, Maximize, Minimize } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const centerIndia = {
  lat: 20.5937,
  lng: 78.9629
};

const libraries: ("places" | "geometry")[] = ["geometry"];

interface LiveMapProps {
  origin?: string;
  destination?: string;
  driverLocation?: { lat: number; lng: number } | null;
  companyId?: string; // If provided, fetches and displays all trucks for this company
  driverId?: string; // If provided alongside companyId, filters to only this driver
}

export default function LiveMap({ origin, destination, driverLocation, companyId, driverId }: LiveMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const [routePath, setRoutePath] = useState<google.maps.LatLng[]>([]);
  const [originCoord, setOriginCoord] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoord, setDestCoord] = useState<google.maps.LatLngLiteral | null>(null);
  const [companyShipments, setCompanyShipments] = useState<any[]>([]);
  const [showTraffic, setShowTraffic] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCenter = (companyId && driverId && companyShipments.length > 0 && companyShipments[0].driverLocation) 
    ? companyShipments[0].driverLocation 
    : driverLocation || originCoord || centerIndia;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!mapInstance || !window.google) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    if (companyId) {
      companyShipments.forEach(shipment => {
        if (shipment.driverLocation) {
          bounds.extend(shipment.driverLocation);
          hasPoints = true;
        }
      });
    } else {
      if (originCoord) { bounds.extend(originCoord); hasPoints = true; }
      if (destCoord) { bounds.extend(destCoord); hasPoints = true; }
      if (driverLocation) { bounds.extend(driverLocation); hasPoints = true; }
      routePath.forEach(pathCoord => { bounds.extend(pathCoord); hasPoints = true; });
    }

    if (hasPoints) {
      mapInstance.fitBounds(bounds);
      const listener = window.google.maps.event.addListener(mapInstance, 'idle', () => {
        const zoom = mapInstance.getZoom();
        if (zoom && zoom > 15) {
          mapInstance.setZoom(15);
        }
        window.google.maps.event.removeListener(listener);
      });
    } else if (currentCenter) {
      mapInstance.panTo(currentCenter);
      mapInstance.setZoom(driverId || driverLocation ? 12 : 5);
    }
  }, [mapInstance, companyShipments, originCoord, destCoord, driverLocation, routePath, companyId, currentCenter, driverId]);

  // Connect to socket.io to listen for live location updates
  useEffect(() => {
    if (!companyId) return;

    socketRef.current = io(window.location.origin);
    
    socketRef.current.on(`locationUpdate_${companyId}`, (data: { shipmentId: string, coords: { lat: number, lng: number } }) => {
       setCompanyShipments(prev => prev.map(shipment => 
         shipment.id === data.shipmentId 
           ? { ...shipment, driverLocation: data.coords }
           : shipment
       ));
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [companyId]);

  // Fetch all in-transit shipments for the company if companyId is provided
  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, 'shipments'),
      where('companyId', '==', companyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let active = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((doc: any) => doc.status === 'in-transit');
        
      if (driverId) {
        active = active.filter((doc: any) => doc.assignedDriverId === driverId);
      }
      setCompanyShipments(active);
    }, (error) => {
      console.error("LiveMap Snapshot Error: ", error);
    });

    return () => unsubscribe();
  }, [companyId, driverId]);

  useEffect(() => {
    if (!isLoaded || !origin || !destination) return;

    const fetchRoute = async () => {
      try {
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
            'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation'
          },
          body: JSON.stringify({
            origin: { address: origin },
            destination: { address: destination },
            travelMode: 'DRIVE'
          })
        });

        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
           const route = data.routes[0];
           
           if (route.polyline && route.polyline.encodedPolyline) {
               const decodedPath = window.google.maps.geometry.encoding.decodePath(route.polyline.encodedPolyline);
               setRoutePath(decodedPath);
           }
           
           if (route.legs && route.legs.length > 0) {
               const leg = route.legs[0];
               if (leg.startLocation && leg.startLocation.latLng) {
                   setOriginCoord({
                       lat: leg.startLocation.latLng.latitude,
                       lng: leg.startLocation.latLng.longitude
                   });
               }
               if (leg.endLocation && leg.endLocation.latLng) {
                   setDestCoord({
                       lat: leg.endLocation.latLng.latitude,
                       lng: leg.endLocation.latLng.longitude
                   });
               }
           }
        } else {
             console.error("Error fetching directions with Routes API:", data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchRoute();
  }, [isLoaded, origin, destination]);

  if (loadError) {
    return <div className="p-4 bg-rose-50 text-rose-700 rounded-xl">Error loading map.</div>;
  }

  if (!isLoaded) {
    return <div className="p-4 bg-slate-50 text-slate-500 rounded-xl animate-pulse h-full min-h-[400px]">Loading Map...</div>;
  }

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return <div className="p-4 bg-amber-50 text-amber-700 rounded-xl h-full min-h-[400px] flex items-center justify-center text-center">Please set VITE_GOOGLE_MAPS_API_KEY in .env to view the map.</div>;
  }

  // Define a custom truck icon
  const truckSvgURI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#2563eb" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1" y="3" width="15" height="13"></rect>
  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
  <circle cx="5.5" cy="18.5" r="2.5"></circle>
  <circle cx="18.5" cy="18.5" r="2.5"></circle>
</svg>
`)}`;

  const truckIcon = {
    url: truckSvgURI,
    scaledSize: new window.google.maps.Size(36, 36),
    anchor: new window.google.maps.Point(18, 18)
  };

  return (
    <div ref={containerRef} className={`relative shadow-inner w-full h-full min-h-[400px] border border-slate-200/60 overflow-hidden ${isFullscreen ? '' : 'rounded-2xl'}`}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', minHeight: '400px' }}
        center={currentCenter}
        zoom={driverId || driverLocation ? 12 : 5}
        onLoad={(map) => setMapInstance(map)}
        onUnmount={() => setMapInstance(null)}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false // Disable default to use ours
        }}
      >
        {showTraffic && <TrafficLayer />}
        
        {!companyId && routePath.length > 0 && (
          <Polyline 
            path={routePath} 
            options={{
              strokeColor: '#2563eb', // blue-600
              strokeWeight: 5,
              strokeOpacity: 0.8
            }}
          />
        )}

        {!companyId && originCoord && (
          <Marker position={originCoord} title="Origin" />
        )}
        
        {!companyId && destCoord && (
          <Marker position={destCoord} title="Destination" />
        )}

        {driverLocation && !companyId && (
          <Marker 
            position={driverLocation} 
            icon={truckIcon}
            title="Driver's Live Location"
            zIndex={999}
          />
        )}
        
        {/* Render all company trucks if companyId mode is active */}
        {companyId && companyShipments.map((shipment) => (
          shipment.driverLocation && (
            <Marker 
              key={shipment.id}
              position={shipment.driverLocation} 
              icon={truckIcon}
              title={`Shipment: ${shipment.trackingId}`}
              zIndex={999}
            />
          )
        ))}
      </GoogleMap>
      
      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-14 z-10 flex gap-2">
        <button
          onClick={toggleFullscreen}
          className="flex items-center justify-center p-2 rounded-xl text-slate-700 bg-white/80 backdrop-blur-md border border-slate-200 shadow hover:bg-slate-50 transition-colors"
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium shadow border transition-colors backdrop-blur-md ${
            showTraffic 
              ? 'bg-blue-600/90 text-white border-transparent hover:bg-blue-700' 
              : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Navigation className="w-4 h-4" />
          {showTraffic ? 'Hide Traffic' : 'Traffic'}
        </button>
      </div>
    </div>
  );
}
