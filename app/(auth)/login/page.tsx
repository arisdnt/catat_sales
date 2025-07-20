'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkAuth()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else if (data.user && data.session) {
        toast({
          title: 'Berhasil',
          description: 'Login berhasil, mengalihkan...',
        })
        
        // Simple direct redirect after successful login
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan yang tidak terduga',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/image/bg_login.jpg)',
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-xs p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border border-white/30 bg-white/20 backdrop-blur-sm text-white placeholder:text-white/70 focus:bg-white/30 focus:ring-2 focus:ring-white/50 transition-all duration-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border border-white/30 bg-white/20 backdrop-blur-sm text-white placeholder:text-white/70 focus:bg-white/30 focus:ring-2 focus:ring-white/50 transition-all duration-200 rounded-lg"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-white backdrop-blur-sm" 
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}