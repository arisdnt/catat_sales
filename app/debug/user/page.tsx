'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function UserDebugPage() {
  const { user, session, loading } = useAuth()

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isAdmin = user?.user_metadata?.role === 'admin' || 
                 user?.email?.includes('admin') ||
                 user?.email?.endsWith('@teracendani.com')

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Authentication Status</h3>
            <Badge variant={user ? 'default' : 'destructive'}>
              {user ? 'Authenticated' : 'Not Authenticated'}
            </Badge>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Admin Status</h3>
            <Badge variant={isAdmin ? 'default' : 'destructive'}>
              {isAdmin ? 'Admin Access' : 'No Admin Access'}
            </Badge>
          </div>

          {user && (
            <div>
              <h3 className="font-semibold mb-2">User Information</h3>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
                
                <h4 className="font-semibold mt-4 mb-2">User Metadata:</h4>
                <pre className="text-sm bg-white p-2 rounded border overflow-auto">
                  {JSON.stringify(user.user_metadata, null, 2)}
                </pre>
                
                <h4 className="font-semibold mt-4 mb-2">App Metadata:</h4>
                <pre className="text-sm bg-white p-2 rounded border overflow-auto">
                  {JSON.stringify(user.app_metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {session && (
            <div>
              <h3 className="font-semibold mb-2">Session Information</h3>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p><strong>Access Token:</strong> {session.access_token.substring(0, 50)}...</p>
                <p><strong>Expires At:</strong> {new Date(session.expires_at! * 1000).toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}