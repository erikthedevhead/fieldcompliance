'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi, ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'

export function LoginForm() {
  const router = useRouter()
  const setSession = useAuthStore(s => s.setSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { accessToken, user } = await authApi.login(email, password)
      setSession(accessToken, user)
      router.push('/')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setError('Those credentials didn\'t work. Try again.')
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Couldn\'t reach the server. Is it running?')
      }
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

<Link
  href="/forgot-password"
  className="text-[13px] text-info hover:underline self-start -mt-2"
>
  Forgot password?
</Link>

      {error && (
        <div className="rounded border border-overdue/30 bg-overdue-bg px-3 py-2 text-[13px] text-overdue">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="mt-1">
        {isLoading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
