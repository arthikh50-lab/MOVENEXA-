import { Request, Response } from 'express';
import { getRealtimeDB } from '../config/firebase.js';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderDetails, destination, customer } = req.body;
    
    // Construct the payload you want to save securely
    const orderData = {
      orderDetails: orderDetails || 'Standard Order',
      destination: destination || 'Unknown',
      customer: customer || 'Guest',
      status: 'pending',
    };

    // Access the Realtime Database using the initialized Admin SDK
    const db = getRealtimeDB();
    const ordersRef = db.ref('orders');
    
    // .push() securely generates a new unique ID in the Realtime Database
    const newOrderRef = ordersRef.push();
    
    await newOrderRef.set({
      ...orderData,
      createdAt: new Date().toISOString(),
      // Track who created this order securely from the server-side JWT auth
      createdBy: req.user?.userId || 'anonymous-user',
      creatorRole: req.user?.role || 'Guest',
    });

    res.status(201).json({ 
      message: 'New order saved securely via Firebase Admin Realtime Database',
      orderId: newOrderRef.key,
      data: orderData
    });
  } catch (error: any) {
    console.error('Error saving order to Realtime Database:', error);
    res.status(500).json({ error: 'Failed to save order securely' });
  }
};
