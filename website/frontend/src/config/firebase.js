import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBf-ntmbVVAc0vPm6rWRdNKED2CxOwn88E",
  authDomain: "gen-lang-client-0365996859.firebaseapp.com",
  projectId: "gen-lang-client-0365996859",
  storageBucket: "gen-lang-client-0365996859.firebasestorage.app",
  messagingSenderId: "578215932611",
  appId: "1:578215932611:web:57c38620890ac9b3ac2876"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);