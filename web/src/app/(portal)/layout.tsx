'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <span className="w-6 h-6 border-2 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </>
  )
}
