import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getIO } from '../socket.js';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      res.status(400).json({ error: 'companyId is required' });
      return;
    }

    const db = getFirestore();
    const snapshot = await db.collection('notifications')
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
      
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(notifications);
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, title, message, type } = req.body;
    
    if (!companyId || !title || !message || !type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const db = getFirestore();
    const newNotification = {
      companyId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('notifications').add(newNotification);
    const notification = { id: docRef.id, ...newNotification };

    // Emit via socket
    try {
      const io = getIO();
      io.emit(`new_notification_${companyId}`, notification);
    } catch (err) {
      console.warn("Socket.io emit failed:", err);
    }
    
    res.status(201).json(notification);
  } catch (error: any) {
    console.error("Error creating notification:", error);
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getFirestore();
    
    await db.collection('notifications').doc(id).update({
      read: true
    });
    
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: error.message });
  }
};
