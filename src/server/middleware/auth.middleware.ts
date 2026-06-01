import { Request, Response, NextFunction } from 'express';
import { getDB, getAuth } from '../config/firebase.js';

export type UserRole = 'admin' | 'manager' | 'driver';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
        companyId: string;
        email?: string;
        name?: string;
      };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);

    // Fetch user details from Firestore
    const db = getDB();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      res.status(401).json({ error: 'Unauthorized: User record missing in database' });
      return;
    }

    const userData = userDoc.data();

    req.user = {
      userId: decodedToken.uid,
      role: userData?.role || 'driver',
      companyId: userData?.companyId || 'default-company',
      email: userData?.email || decodedToken.email,
      name: userData?.name,
    };
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireRoles = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};

export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user || !req.user.companyId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const db = getDB();
    const subDoc = await db.collection('subscriptions').doc(req.user.companyId).get();
    
    if (subDoc.exists) {
      const sub = subDoc.data() as any;
      if (sub.status === 'expired' || new Date(sub.expiryDate) < new Date()) {
        res.status(403).json({ 
          error: 'Subscription expired', 
          code: 'SUBSCRIPTION_EXPIRED' 
        });
        return;
      }
    }
    next();
  } catch (err) {
    console.error("Subscription check error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
