import * as admin from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth as getFirebaseAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json");
}

export function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  let serviceAccount: any = null;

  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      console.log('Found serviceAccountKey.json, using it to initialize Firebase Admin');
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading serviceAccountKey.json:', err);
  }

  const serviceAccountKeyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount && serviceAccountKeyStr) {
    try {
      // Parse as JSON directly, or decode from base64 if it doesn't look like JSON
      if (!serviceAccountKeyStr.trim().startsWith('{')) {
        const decoded = Buffer.from(serviceAccountKeyStr, 'base64').toString('utf8');
        if (decoded.trim().startsWith('{')) {
          serviceAccount = JSON.parse(decoded);
        } else {
          throw new Error('Not valid JSON or base64 JSON');
        }
      } else {
        serviceAccount = JSON.parse(serviceAccountKeyStr);
      }
    } catch (err: any) {
       console.warn("⚠️ Warning: FIREBASE_SERVICE_ACCOUNT_KEY is populated but could not be parsed as JSON.");
       console.warn("⚠️ If you are using Application Default Credentials (e.g. in AI Studio), you can leave this environment variable blank.");
    }
  }

  // Support individual environment variables as fallback
  if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }

  if (serviceAccount) {
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId
    });
    console.log("LogiTrack AI: Firebase Admin SDK connected successfully! ✅");
    return app;
  }

  console.warn("⚠️ serviceAccountKey.json is missing and FIREBASE_SERVICE_ACCOUNT_KEY environment variable is invalid or missing.");
  console.warn("Using application default credentials for Firebase Admin initialization.");
  return initializeApp({
    projectId: firebaseConfig.projectId
  });
}

export const getDB = () => getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
export const getRealtimeDB = () => getDatabase();
export const getAuth = () => getFirebaseAuth();
