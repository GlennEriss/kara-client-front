import { adminAuth } from '@/firebase/adminAuth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ authenticated: false, error: 'No token provided' }, { status: 401 })
    }

    // Vérifier le token avec Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    return NextResponse.json({ 
      authenticated: true, 
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified
      }
    })
  } catch (error) {
    console.error('Token verification failed:', error)
    return NextResponse.json({ authenticated: false, error: 'Invalid token' }, { status: 401 })
  }
}