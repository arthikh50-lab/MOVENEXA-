import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

export const getSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({ error: 'companyId is required' });
      return;
    }

    const db = getFirestore();
    const subDoc = await db.collection('subscriptions').doc(companyId).get();
    
    // Default subscription if one hasn't been created yet
    let subscription = {
      plan: 'Basic',
      status: 'active',
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days free trial
    };

    if (subDoc.exists) {
      subscription = subDoc.data() as any;
    } else {
      await db.collection('subscriptions').doc(companyId).set(subscription);
    }
    
    res.status(200).json(subscription);
  } catch (error: any) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { plan } = req.body;
    
    if (!companyId || !plan) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const db = getFirestore();
    
    let daysToAdd = 30; // 30 days for testing
    const newExpiry = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    const subscription = {
      plan,
      status: 'active',
      expiryDate: newExpiry
    };

    await db.collection('subscriptions').doc(companyId).set(subscription, { merge: true });
    
    res.status(200).json(subscription);
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    res.status(500).json({ error: error.message });
  }
};
