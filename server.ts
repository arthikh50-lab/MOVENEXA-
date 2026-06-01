
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { initSocket } from './src/server/socket.js';
import authRoutes from './src/server/routes/auth.routes.js';
import orderRoutes from './src/server/routes/orders.routes.js';
import analyticsRoutes from './src/server/routes/analytics.routes.js';
import notificationRoutes from './src/server/routes/notifications.routes.js';
import subscriptionRoutes from './src/server/routes/subscription.routes.js';
import { initFirebaseAdmin } from './src/server/config/firebase.js';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Database connection
try {
  initFirebaseAdmin();
  console.log('Firebase Admin initialized successfully');
} catch (err) {
  console.error('Failed to initialize Firebase Admin:', err);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscription', subscriptionRoutes);

// General health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MoveNexa Backend Running' });
});

async function startServer() {
  let vite: any;
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });

  // Vercel/Serverless environments don't reliably support long-lived WebSocket servers.
  // For the first deploy, keep real-time disabled on Vercel.
  const shouldInitSocket = process.env.VERCEL !== '1' && process.env.VERCEL !== 'true';

  const destinationCache = new Map<string, any>();
  let io: any = null;

  if (shouldInitSocket) {
    io = initSocket(server);

    io.on('connection', (socket: any) => {
      console.log('User connected to socket:', socket.id);

      socket.on('driverLocationUpdate', async (data: any) => {
        const { shipmentId, coords, companyId, destination } = data;

        // Broadcast to anyone listening for this company's fleet updates or this specific shipment
        io.emit(`locationUpdate_${companyId}`, { shipmentId, coords });
        io.emit(`locationUpdate_shipment_${shipmentId}`, { coords });

        try {
          if (shipmentId && coords && destination) {
            // Backend Logic for ETA Calculation
            let destCoords = destinationCache.get(destination);

            if (!destCoords) {
              const geoRes = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${process.env.VITE_GOOGLE_MAPS_API_KEY}`
              );
              const geoData = await geoRes.json();

              if (geoData?.results?.[0]?.geometry?.location) {
                destCoords = geoData.results[0].geometry.location;
                destinationCache.set(destination, destCoords);
              }
            }

            if (destCoords) {
              // Haversine distance
              const R = 6371; // km
              const dLat = (destCoords.lat - coords.lat) * (Math.PI / 180);
              const dLon = (destCoords.lng - coords.lng) * (Math.PI / 180);
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(coords.lat * (Math.PI / 180)) *
                  Math.cos(destCoords.lat * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distanceKm = R * c;

              const avgSpeedKmh = 40;
              const hoursRemaining = distanceKm / avgSpeedKmh;
              const newEtaMs = Date.now() + hoursRemaining * 60 * 60 * 1000;
              const newEtaDate = new Date(newEtaMs).toISOString();

              // Broadcast real-time ETA to trackers
              io.emit(`etaUpdate_${shipmentId}`, {
                eta: newEtaDate,
                distance: distanceKm.toFixed(1),
              });

              // Update ETA in DB
              const db = getFirestore();
              await db.collection('shipments').doc(shipmentId).update({
                eta: newEtaDate,
              });
            }
          }
        } catch (err) {
          console.error('Error calculating ETA on backend:', err);
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected from socket:', socket.id);
      });
    });
  }

  // Graceful shutdown to prevent EADDRINUSE errors on restart
  const shutdown = async () => {
    console.log('Shutting down gracefully...');

    if (vite) {
      await vite.close();
      console.log('Vite server closed.');
    }

    if (io) {
      io.close();
    }

    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force close after 5s
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();

