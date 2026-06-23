import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Apiary {
  apiary_id: string; name: string; region: string | null
  season_start: string | null; season_end: string | null
  target_flora: string | null
}
interface Harvest  { apiary_id: string; kg_total: number }
interface HiveExp  { apiary_id: string | null; amount: number }
interface Treat    { apiary_id: string | null; cost: number | null }
interface Visit    { apiary_id: string; transport_cost: number | null; supply_cost: number | null }
interface HostPay  { apiary_id: string; amount: number }
interface Transit  { from_apiary_id: string; driver_cost: number | null; fuel_cost: number | null }
interface HiveRow  { apiary_id: string | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d })

function apiaryTotalCost(
  id: string,
  visits: Visit[], hiveExps: HiveExp[], treats: Treat[],
  hostPays: HostPay[], transits: Transit[]
): number {
  return (
    visits.filter(v => v.apiary_id === id).reduce((s, v) => s + (v.transport_cost ?? 0) + (v.supply_cost ?? 0), 0) +
    hiveExps.filter(e => e.apiary_id === id).reduce((s, e) => s + e.amount, 0) +
    treats.filter(tr => tr.apiary_id === id).reduce((s, tr) => s + (tr.cost ?? 0), 0) +
    hostPays.filter(h => h.apiary_id === id).reduce((s, h) => s + h.amount, 0) +
    transits.filter(tr => tr.from_apiary_id === id).reduce((s, tr) => s + (tr.driver_cost ?? 0) + (tr.fuel_cost ?? 0), 0)
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApiariesList() {
  const navigate = useNavigate()
  const { t, isAr, toggle } = useLang()
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [hiveExps, setHiveExps] = useState<HiveExp[]>([])
  const [treats,   setTreats]   = useState<Treat[]>([])
  const [visits,   setVisits]   = useState<Visit[]>([])
  const [hostPays, setHostPays] = useState<HostPay[]>([])
  const [transits, setTransits] = useState<Transit[]>([])
  const [hives,    setHives]    = useState<HiveRow[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [a, h, he, tr, v, hp, tl, hv] = await Promise.all([
        supabase.from('apiaries').select('apiary_id,name,region,season_start,season_end,target_flora').order('season_start', { ascending: false }),
        supabase.from('harvests').select('apiary_id,kg_total'),
        supabase.from('hive_expenses').select('apiary_id,amount'),
        supabase.from('health_treatments').select('apiary_id,cost'),
        supabase.from('visit_logs').select('apiary_id,transport_cost,supply_cost'),
        supabase.from('host_payments').select('apiary_id,amount'),
        supabase.from('transit_logs').select('from_apiary_id,driver_cost,fuel_cost'),
        supabase.from('hives').select('apiary_id'),
      ])
      if (a.error) { setError(a.error.message); setLoading(false); return }
      setApiaries(a.data ?? [])
      setHarvests(h.data ?? [])
      setHiveExps(he.data ?? [])
      setTreats(tr.data ?? [])
      setVisits(v.data ?? [])
      setHostPays(hp.data ?? [])
      setTransits(tl.data ?? [])
      setHives(hv.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const summaries = useMemo(() => apiaries.map(a => ({
    ...a,
    hiveCount: hives.filter(h => h.apiary_id === a.apiary_id).length,
    totalKg:   harvests.filter(h => h.apiary_id === a.apiary_id).reduce((s, h) => s + h.kg_total, 0),
    totalCost: apiaryTotalCost(a.apiary_id, visits, hiveExps, treats, hostPays, transits),
  })), [apiaries, hives, harvests, visits, hiveExps, treats, hostPays, transits])

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
            <h1 className="text-base font-bold">{t('Apiaries', 'المناحل')} 📍</h1>
            <p className="text-xs text-gray-400 mt-0.5">{t('All seasons & campaigns', 'جميع المواسم والحملات')}</p>
          </div>
          <button onClick={toggle} className="text-xs bg-white/10 px-2.5 py-1 rounded-full hover:bg-white/20 transition-colors font-medium">
            {isAr ? 'EN' : 'AR'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3 pb-8">

        {summaries.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">{t('No apiaries recorded yet', 'لا توجد مناحل مسجلة بعد')}</p>
        )}

        {summaries.map(a => {
          const isActive = !a.season_end
          return (
            <div key={a.apiary_id} onClick={() => navigate(`/honey/apiaries/${a.apiary_id}`)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.99]">

              {/* Top row: name + status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base">{a.name}</h3>
                  {a.region && <p className="text-sm text-gray-400 mt-0.5">{a.region}</p>}
                  {a.target_flora && <p className="text-xs text-amber-600 mt-0.5">🌸 {a.target_flora}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isActive ? t('Active', 'نشط') : t('Closed', 'منتهي')}
                  </span>
                  <Arrow size={16} className="text-gray-300" />
                </div>
              </div>

              {/* Season dates */}
              <p className="text-xs text-gray-400 mb-3">
                {a.season_start ?? '—'} → {a.season_end ?? t('now', 'الآن')}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl py-2">
                  <div className="text-sm font-bold text-gray-900">{a.hiveCount}</div>
                  <div className="text-xs text-gray-400">{t('Hives', 'خلايا')}</div>
                </div>
                <div className="bg-amber-50 rounded-xl py-2">
                  <div className="text-sm font-bold text-amber-700">{fmt(a.totalKg, 1)} kg</div>
                  <div className="text-xs text-gray-400">{t('Harvest', 'الحصاد')}</div>
                </div>
                <div className="bg-gray-50 rounded-xl py-2">
                  <div className="text-sm font-bold text-gray-900">${fmt(a.totalCost, 0)}</div>
                  <div className="text-xs text-gray-400">{t('Costs', 'التكاليف')}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
