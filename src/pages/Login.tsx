import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // If already logged in, go straight to the app
  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      setLoading(false)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6" dir="rtl">

      {/* Logo / App name */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🏠</div>
        <h1 className="text-2xl font-bold text-gray-900">عائلة ايهاب عبد الفتاح</h1>
        <p className="text-gray-400 text-sm mt-1">إدارة الأعمال العائلية</p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base outline-none focus:border-amber-400 transition-colors placeholder-gray-300"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base outline-none focus:border-amber-400 transition-colors placeholder-gray-300"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors cursor-pointer"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-300 mt-8 text-center">
        للحصول على حساب تواصل مع المطوّر
      </p>
    </div>
  )
}
