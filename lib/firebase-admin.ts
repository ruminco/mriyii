import * as admin from 'firebase-admin';

function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Критична помилка: Не налаштовані змінні оточення Firebase Admin (NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).'
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Серверна перевірка Firebase ID-токена через firebase-admin.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Не передано дійсний Firebase ID Token.');
  }

  const app = getFirebaseAdminApp();
  const decodedToken = await app.auth().verifyIdToken(idToken, true);

  if (!decodedToken.email) {
    throw new Error('Обліковий запис Firebase повинен містити підтверджений email.');
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    name: decodedToken.name,
    picture: decodedToken.picture,
  };
}
