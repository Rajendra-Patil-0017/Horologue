import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

// Clean the private key: replace escaped newlines and strip surrounding quotes if any
const privateKey = privateKeyRaw
  ? privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
  : undefined;

if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Firebase Admin SDK configuration is incomplete. Check environment variables.');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

export const auth = admin.auth();
export default admin;
