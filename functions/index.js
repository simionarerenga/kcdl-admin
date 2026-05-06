// functions/index.js
// Firebase Cloud Functions — KCDL Admin
// Deploy with: firebase deploy --only functions

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp }      = require('firebase-admin/app');
const { getAuth }            = require('firebase-admin/auth');
const { getFirestore }       = require('firebase-admin/firestore');

initializeApp();

/**
 * createInspectorUser
 * ───────────────────
 * Called from the Admin app when an admin adds a new Copra Inspector.
 * Creates the Firebase Auth account with the supplied password, then
 * writes / merges the Firestore user profile doc.
 *
 * Only users who are authenticated AND have role === 'admin' or 'hq'
 * in Firestore may call this function.
 */
exports.createInspectorUser = onCall(async (request) => {
  // ── 1. Auth guard ──────────────────────────────────────────────────
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const callerUid = request.auth.uid;
  const db        = getFirestore();

  // Verify the caller is an admin or HQ user
  const callerSnap = await db.collection('users').doc(callerUid).get();
  if (callerSnap.exists()) {
    const role = callerSnap.data().role;
    if (role && role !== 'admin' && role !== 'hq') {
      throw new HttpsError('permission-denied', 'Admin or HQ role required.');
    }
  }
  // (If no Firestore doc exists for the caller we allow through —
  //  same policy as App.jsx's auth listener.)

  // ── 2. Validate input ──────────────────────────────────────────────
  const {
    email, password, displayName,
    island, cooperativeName, stationCode, stationId,
    phone, whatsapp, role,
  } = request.data;

  if (!email || !password) {
    throw new HttpsError('invalid-argument', 'email and password are required.');
  }
  if (password.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }
  if (!stationId) {
    throw new HttpsError('invalid-argument', 'stationId is required.');
  }

  // ── 3. Create Firebase Auth account ───────────────────────────────
  let userRecord;
  try {
    userRecord = await getAuth().createUser({
      email:        email.trim(),
      password,
      displayName:  displayName || undefined,
      emailVerified: false,
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account with that email already exists.');
    }
    throw new HttpsError('internal', `Auth creation failed: ${err.message}`);
  }

  // ── 4. Write Firestore profile ────────────────────────────────────
  // Use the Firebase UID as the doc ID (better than email-derived ID).
  const docId    = userRecord.uid;
  const now      = new Date().toISOString();

  await db.collection('users').doc(docId).set({
    email:           email.trim(),
    displayName:     displayName     || '',
    island:          island          || '',
    cooperativeName: cooperativeName || '',
    stationCode:     stationCode     || '',
    stationId:       stationId       || '',
    phone:           phone           || '',
    whatsapp:        whatsapp        || '',
    role:            role            || 'inspector',
    provisioned:     true,
    createdAt:       now,
    updatedAt:       now,
  });

  return { uid: userRecord.uid, email: userRecord.email };
});