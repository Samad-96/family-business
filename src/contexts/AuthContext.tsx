import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Profile {
  id:   string
  name: string
  role: string
}

interface AuthContextType {
  session:  Session | null
  profile:  Profile | null
  modules:  string[]
  loading:  boolean
  signOut:  () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  modules: [],
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [modules, setModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string, email?: string) {
    const [profileRes, permsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_permissions').select('module').eq('user_id', userId),
    ])

    // Load permissions
    if (permsRes.data) setModules(permsRes.data.map(p => p.module))

    // Load or auto-create profile
    if (profileRes.data) {
      setProfile(profileRes.data)
    } else {
      const name = email?.split('@')[0] || 'مستخدم'
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: userId, name })
        .select()
        .single()
      setProfile(created)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id, session.user.email)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id, session.user.email)
      else { setProfile(null); setModules([]); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session !== null || profile !== null) setLoading(false)
    if (session === null) setLoading(false)
  }, [session, profile])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, modules, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
