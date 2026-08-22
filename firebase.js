import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB02CLJIYLJgQ2LkMVgYomObyl1kQC84eI',
  authDomain: 'omniplay-op.firebaseapp.com',
  projectId: 'omniplay-op',
  storageBucket: 'omniplay-op.firebasestorage.app',
  messagingSenderId: '742295844045',
  appId: '1:742295844045:web:8399ae7bdb21c6a9d12584',
  measurementId: 'G-78R4XRF4KT'
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
try { getAnalytics(app); } catch (e) { console.info('Analytics unavailable in this browser.', e); }
