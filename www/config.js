/* Proyecto de Firebase para las cuentas y la sincronización.
   Estos datos son públicos por diseño: la seguridad la dan las reglas de Firestore (ci/firestore.rules). */
const FIREBASE_CFG = {
  apiKey: '',                       // Configuración del proyecto → Tus apps → Web
  projectId: 'forja-app-d0884',
  googleClientId: '394190315649-cmg9nvgn79g4m7mo0vcuoo2vgoburtti.apps.googleusercontent.com', // ID de cliente web (Authentication → Google)
};
const FIREBASE = FIREBASE_CFG.apiKey ? FIREBASE_CFG : null;
