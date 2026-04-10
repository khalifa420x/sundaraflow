/**
 * scripts/migrateUsers.ts
 *
 * Non-destructive Firebase Admin migration.
 * Completes missing fields on users/{uid} documents without overwriting
 * existing values. Sets migrated:true on each processed document.
 *
 * REQUIREMENTS:
 *   npm install -D firebase-admin tsx
 *   Place your service account key at scripts/serviceAccountKey.json
 *   (never commit this file — it's in .gitignore)
 *
 * USAGE:
 *   npx tsx scripts/migrateUsers.ts [--dry-run]
 *
 * --dry-run  Logs what would be written without touching Firestore.
 */

import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// ── Init ─────────────────────────────────────────────────────────────────────

const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(KEY_PATH)) {
  console.error('❌  serviceAccountKey.json not found at', KEY_PATH);
  console.error('    Download it from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(KEY_PATH),
  });
}

const db   = getFirestore();
const auth = getAuth();

const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('🔍  DRY RUN — no writes will be performed\n');

// ── Helpers ──────────────────────────────────────────────────────────────────

type UserRecord = admin.auth.UserRecord;

function inferRole(user: UserRecord, existing: admin.firestore.DocumentData): 'coach' | 'client' {
  // Preserve existing role if set
  if (existing.role === 'coach' || existing.role === 'client') return existing.role;
  // Fallback heuristic: check custom claims
  return (user.customClaims?.role as 'coach' | 'client') ?? 'client';
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('🚀  Starting non-destructive user migration…\n');

  let pageToken: string | undefined;
  let processed = 0;
  let skipped   = 0;
  let errors    = 0;

  do {
    const listResult = await auth.listUsers(1000, pageToken);

    for (const user of listResult.users) {
      const docRef = db.collection('users').doc(user.uid);
      const snap   = await docRef.get();
      const data   = snap.exists ? snap.data()! : {};

      // Already fully migrated — skip
      if (data.migrated === true) {
        skipped++;
        continue;
      }

      // Build patch — only set fields that are missing
      const patch: Record<string, unknown> = {};

      if (!data.email)       patch.email       = user.email ?? '';
      if (!data.displayName) patch.displayName = user.displayName ?? user.email?.split('@')[0] ?? '';
      if (!data.role)        patch.role        = inferRole(user, data);
      if (!data.createdAt)   patch.createdAt   = FieldValue.serverTimestamp();

      // Always stamp migrated:true
      patch.migrated = true;

      if (DRY_RUN) {
        console.log(`[DRY]  uid=${user.uid}  patch=`, JSON.stringify(patch));
      } else {
        try {
          await docRef.set(patch, { merge: true });
          console.log(`✅  Migrated uid=${user.uid}  role=${data.role ?? patch.role}`);
        } catch (err) {
          console.error(`❌  Failed uid=${user.uid}`, err);
          errors++;
          continue;
        }
      }

      processed++;
    }

    pageToken = listResult.pageToken;
  } while (pageToken);

  console.log(`\n── Done ──────────────────────────────────`);
  console.log(`   Processed : ${processed}`);
  console.log(`   Skipped   : ${skipped}  (already migrated)`);
  console.log(`   Errors    : ${errors}`);
  if (DRY_RUN) console.log('\n   Re-run without --dry-run to apply changes.');
}

migrate().catch((err) => { console.error(err); process.exit(1); });
