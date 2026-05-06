// src/utils/auditLog.js
// Call logAudit() from any section that creates/edits/deletes data.
// Each entry is written to Firestore 'auditLogs' with no reads required.

import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * @param {'create'|'update'|'delete'} action
 * @param {'user'|'cooperative'|'island'|'village'|'station'} entity
 * @param {string} entityName  — human-readable name e.g. "John Tebuke"
 * @param {object} details     — optional key/value pairs describing the change
 * @param {string} performedBy — admin's email address
 */
export async function logAudit(action, entity, entityName, details = {}, performedBy = 'unknown') {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action,
      entity,
      entityName,
      details,
      performedBy,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Never let audit logging crash the main operation
  }
}
