import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Hive {
  hive_id: string; label: string; status: string; origin: string
  apiary_id: string | null
}
interface Apiary      { apiary_id: string; name: string }
interface Inspection  { hive_id: string; overall_health: number | null; check_date: string }
interface HiveExp     { hive_id: string; amount: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  dead:   'bg-red-100   text-red-700',
  sold:   'bg-gray-100  text-gray-500',
  merged: 'bg-blue-100  text-blue-700',
}

const HEALTH_CLS: Record<number, string> = {
  1: 'bg-red-100   text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-green-100 text-green-700',
  5: 'bg-green-100 text-green-800',
}

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d })

// ─── Component ────────────────────────────────────────────────────────────────

export default function HivesList() {
  const navigate = useNavigate()
  const { t, isAr, toggle } = useLang()
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [hives,       setHives]       = useState<Hive[]>([])
  const [apiaries,    setApiaries]    = useState<Apiary[]>([])
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [hiveExps,    setHiveExps]    = useState<HiveExp[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [hv, ap, ins, he] = await Promise.all([
        supabase.from('hives').select('hive_id,label,status,origin,apiary_id').order('label'),
        supabase.from('apiaries').select('apiary_id,name'),
        supabase.from('inspections').select('hive_id,overall_health,check_date').order('check_date', { ascending: false }),
        supabase.from('hive_expenses').select('hive_id,amount'),
      ])
      if (hv.error) { setError(hv.error.message); setLoading(false); return }
      setHives(hv.data ?? [])
      setApiaries(ap.data ?? [])
      setInspections(ins.data ?? [])
      setHiveExps(he.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const apiaryMap = useMemo(() => new Map(apiaries.map(a => [a.apiary_id, a.name])), [apiaries])

  // Latest inspection per hive
  const latestInspection = useMemo(() => {
    const map = new Map<string, Inspection>()
    inspections.forEach(i => { if (!map.has(i.hive_id)) map.set(i.hive_id, i) })
    return map
  }, [inspections])

  // Total expense per hive
  const totalExpense = useMemo(() => {
    const map = new Map<string, number>()
    hiveExps.forEach(e => map.set(e.hive_id, (map.get(e.hive_id) ?? 0) + e.amount))
    return map
  }, [hiveExps])

  const dir   = isAr ? 'rtl' : 'ltr'
  const Arrow = isAr ? ChevronLeft : ChevronRight

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={dir}>
      <p className="text-gray-400 text-sm">{t('Loading…', 'جاري التحميل…')}</p>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={dir}>
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/honey')} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <Home size={17} />
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold">{t('Hives', 'الخلايا')} 🐝</h1>
            <p className="text-xs text-gray-400 mt-0.5">{hives.length} {t('hives total', 'خلايا في المجموع')}</p>
          </div>
          <button onClick={toggle} className="text-xs bg-white/10 px-2.5 py-1 rounded-full hover:bg-white/20 transition-colors font-medium">
            {isAr ? 'EN' : 'AR'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3 pb-8">

        {hives.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">{t('No hives recorded yet', 'لا توجد خلايا مسجلة بعد')}</p>
        )}

        {hives.map(hive => {
          const latest  = latestInspection.get(hive.hive_id)
          const expense  = totalExpense.get(hive.hive_id) ?? 0
          const apiaryName = hive.apiary_id ? apiaryMap.get(hive.apiary_id) : null

          return (
            <div key={hive.hive_id} onClick={() => navigate(`/honey/hives/${hive.hive_id}`)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🐝</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{hive.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[hive.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {t(hive.status, hive.status === 'active' ? 'نشطة' : hive.status === 'dead' ? 'ميتة' : hive.status === 'sold' ? 'مباعة' : 'مدمجة')}
                      </span>
                    </div>
                    {apiaryName && <p className="text-xs text-gray-400 mt-0.5">📍 {apiaryName}</p>}
                  </div>
                </div>
                <Arrow size={16} className="text-gray-300 shrink-0" />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {latest ? (
                  <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${HEALTH_CLS[latest.overall_health ?? 0] ?? 'bg-gray-100 text-gray-500'}`}>
                    ❤️ {latest.overall_health}/5 · {latest.check_date}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">{t('No inspections', 'لا توجد فحوصات')}</span>
                )}
                {expense > 0 && (
                  <span className="text-xs text-gray-400">💰 ${fmt(expense, 2)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
