import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { emailToDocId } from '@/lib/utils/docId'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { name, email, goal, weight, height, age, coachId } = await request.json()

    if (!name || !email || !coachId) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const docId = emailToDocId(email)

    const existing = await adminDb.collection('clients').doc(docId).get()
    if (existing.exists) {
      return NextResponse.json({ error: 'Ce client existe déjà' }, { status: 409 })
    }

    // Générer token unique — le client crée son compte sur /join?token=...
    const inviteToken = randomBytes(32).toString('hex')
    const now = Date.now()

    const clientData = {
      docId,
      uid: null,
      email,
      name,
      coachId,
      goal: goal || null,
      inviteToken,
      profile: {
        weight: weight || null,
        height: height || null,
        age: age || null,
      },
      status: 'invited',
      createdAt: now,
    }

    const batch = adminDb.batch()
    batch.set(adminDb.collection('clients').doc(docId), clientData)
    batch.set(adminDb.collection('users').doc(docId), {
      docId,
      uid: null,
      email,
      displayName: name,
      role: 'client',
      coachId,
      status: 'invited',
      inviteToken,
      createdAt: now,
      migrated: true,
      avatarUrl: null,
      profile: {
        weight: weight || null,
        height: height || null,
        age: age || null,
        goal: goal || null,
        activityLevel: null,
      },
    }, { merge: true })

    await batch.commit()

    const inviteLink = `https://sundaraflow.vercel.app/join?token=${inviteToken}`

    console.log('[invite] Client created:', docId, '| Link:', inviteLink)
    return NextResponse.json({ success: true, docId, inviteLink })

  } catch (error: any) {
    console.error('[invite] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
