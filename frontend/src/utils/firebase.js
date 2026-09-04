import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "perppilot-17ba6.firebaseapp.com",
  projectId: "perppilot-17ba6",
  storageBucket: "perppilot-17ba6. firebasestorage.app",
  messagingSenderId: "409293838782",
  appId: "1:409293838782:web:9664301cd0bece1aefc1ef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export { auth, provider };
