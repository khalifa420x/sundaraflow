import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { emailToDocId } from '@/lib/utils/docId'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, goal, weight, height, age, coachId } = await request.json()

    if (!name || !email || !password || !coachId) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mot de passe trop court (6 caractères minimum)' },
        { status: 400 }
      )
    }

    const docId = emailToDocId(email)

    const existing = await adminDb.collection('clients').doc(docId).get()
    if (existing.exists) {
      return NextResponse.json({ error: 'Ce client existe déjà' }, { status: 409 })
    }

    let uid: string
    try {
      const userRecord = await adminAuth.createUser({
        email,
        password,
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
      status: 'active',
      createdAt: now,
    }

    const batch = adminDb.batch()
    batch.set(adminDb.collection('clients').doc(docId), clientData)
    batch.set(adminDb.collection('users').doc(docId), {
      docId,
      uid,
      email,
      displayName: name,
      role: 'client',
      coachId,
      status: 'active',
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

    console.log('[manual] Client created:', docId)
    return NextResponse.json({ success: true, docId })

  } catch (error: any) {
    console.error('[manual] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
