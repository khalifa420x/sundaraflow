import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { emailToDocId } from '@/lib/utils/docId'

export async function POST(request: NextRequest) {
  try {
    const { name, email, goal, weight, height, age, coachId } = await request.json()

    if (!name || !email || !coachId) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const docId = emailToDocId(email)

    // Vérifier doublon
    const existing = await adminDb.collection('clients').doc(docId).get()
    if (existing.exists) {
      return NextResponse.json({ error: 'Ce client existe déjà' }, { status: 409 })
    }

    // Créer compte Firebase Auth
    let uid: string
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'

    try {
      const userRecord = await adminAuth.createUser({
        email,
        password: tempPassword,
        displayName: name,
      })
      uid = userRecord.uid
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        const existingUser = await adminAuth.getUserByEmail(email)
        uid = existingUser.uid
      } else {
        throw authError
      }
    }

    // Générer lien reset password = email d'invitation
    await adminAuth.generatePasswordResetLink(email)

    const now = Date.now()
    const clientData = {
      docId,
      uid,
      email,
      name,
      coachId,
      goal: goal || null,
      profile: {
        weight: weight || null,
        height: height || null,
        age: age || null,
      },
      status: 'invited',
      createdAt: now,
    }

    // Écriture simultanée clients + users
    const batch = adminDb.batch()
    batch.set(adminDb.collection('clients').doc(docId), clientData)
    batch.set(adminDb.collection('users').doc(docId), {
      docId,
      uid,
      email,
      displayName: name,
      role: 'client',
      coachId,
      status: 'invited',
      createdAt: now,
      migrated: true,
      avatarUrl: null,
      inviteToken: null,
      profile: {
        weight: weight || null,
        height: height || null,
        age: age || null,
        goal: goal || null,
        activityLevel: null,
      },
    }, { merge: true })
    await batch.commit()

    console.log('[invite] Client created:', docId)
    return NextResponse.json({ success: true, docId })

  } catch (error: any) {
    console.error('[invite] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
