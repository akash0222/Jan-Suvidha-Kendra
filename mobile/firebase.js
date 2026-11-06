import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDCGM56cA_MrbDYhCePbxzfG4zI1JIFrmc",
  authDomain: "jan-suvidha-kendra-2f4f1.firebaseapp.com",
  projectId: "jan-suvidha-kendra-2f4f1",
  storageBucket: "jan-suvidha-kendra-2f4f1.firebasestorage.app",
  messagingSenderId: "111360398009",
  appId: "1:111360398009:web:a7d156a19ae7e378344168",
  measurementId: "G-6E733VWXW0"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Fast Refresh can re-run this module after Firebase Auth is initialized.
  auth = getAuth(app);
}
export { auth };

