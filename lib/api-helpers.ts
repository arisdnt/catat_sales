import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', user: null }
  }

  const token = authHeader.substring(7)
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      return { error: 'Invalid token', user: null }
    }
    
    return { error: null, user }
  } catch (_error) {
    return { error: 'Authentication failed', user: null }
  }
}

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export async function handleApiRequest(
  request: NextRequest,
  handler: (user: any) => Promise<NextResponse>
) {
  try {
    const { error, user } = await authenticateRequest(request)
    
    if (error) {
      return createErrorResponse(error, 401)
    }
    
    return await handler(user)
  } catch (error) {
    console.error('API Error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}