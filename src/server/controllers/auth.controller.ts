import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDB, getAuth } from '../config/firebase.js';

type UserRole = 'admin' | 'manager' | 'driver';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const validRoles = ['manager', 'driver'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Role must be manager or driver' });
      return;
    }

    // Use Firebase Admin to create the user
    let userRecord;
    try {
      userRecord = await getAuth().createUser({
        email,
        password,
        displayName: name,
      });
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-exists') {
        res.status(400).json({ error: 'User already exists' });
        return;
      }
      throw authErr;
    }

    const db = getDB();
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
      companyId: req.user?.companyId || 'default-company'
    });

    res.status(201).json({ message: 'User registered successfully', userId: userRecord.uid, role });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
