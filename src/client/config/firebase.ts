import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHTxqdxqH6KFph58B0FhLl2WiRStCVBGU",
  authDomain: "movenexa.firebaseapp.com",
  projectId: "movenexa",
  storageBucket: "movenexa.firebasestorage.app",
  messagingSenderId: "639837615614",
  appId: "1:639837615614:web:e767abd09025e55512bcaf",
  measurementId: "G-TVP8HHNJRQ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const analytics = getAnalytics(app);
