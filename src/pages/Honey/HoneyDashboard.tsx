import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Apiary   { apiary_id: string; name: string; region: string | null; season_start: string | null; season_end: string | null }
interface Harvest  { apiary_id: string; kg_total: number; price_per_kg: number | null }
interface HiveExp  { apiary_id: string | null; amount: number }
interface Treat    { apiary_id: string | null; cost: number | null }
interface Visit    { apiary_id: string; transport_cost: number | null; supply_cost: number | null }
interface HostPay  { apiary_id: string; amount: number }
interface Transit  { from_apiary_id: string; driver_cost: number | null; fuel_cost: number | null }
interface Hive     { hive_id: string; apiary_id: string | null; status: string }
interface Inspect  { hive_id: string; overall_health: number | null; check_date: string }

type Scope = 'season' | 'year' | 'all'

// ─── Constants ────────────────────────────────────────────────────────────────

const COST_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444']
const HEALTH_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981']

const SCOPES: { key: Scope; en: string; ar: string }[] = [
  { key: 'season', en: 'Season',   ar: 'الموسم' },
  { key: 'year',   en: 'Year',     ar: 'السنة'  },
  { key: 'all',    en: 'All Time', ar: 'الكل'   },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d })

function scopedIds(apiaries: Apiary[], scope: Scope): Set<string> {
  const year = new Date().getFullYear().toString()
  let list: Apiary[]
  if (scope === 'season') {
    list = apiaries.filter(a => !a.season_end)
    if (!list.length) list = apiaries.slice(0, 1)
  } else if (scope === 'year') {
    list = apiaries.filter(a => a.season_start?.startsWith(year))
  } else {
    list = apiaries
  }
  return new Set(list.map(a => a.apiary_id))
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HoneyDashboard() {
  const navigate       = useNavigate()
  const { t, isAr, toggle } = useLang()
  const [scope, setScope]   = useState<Scope>('season')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [apiaries,  setApiaries]  = useState<Apiary[]>([])
  const [harvests,  setHarvests]  = useState<Harvest[]>([])
  const [hiveExps,  setHiveExps]  = useState<HiveExp[]>([])
  const [treats,    setTreats]    = useState<Treat[]>([])
  const [visits,    setVisits]    = useState<Visit[]>([])
  const [hostPays,  setHostPays]  = useState<HostPay[]>([])
  const [transits,  setTransits]  = useState<Transit[]>([])
  const [hives,     setHives]     = useState<Hive[]>([])
  const [inspects,  setInspects]  = useState<Inspect[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [a, h, he, tr, v, hp, tl, hv, ins] = await Promise.all([
        supabase.from('apiaries').select('apiary_id,name,region,season_start,season_end').order('season_start', { ascending: false }),
        supabase.from('harvests').select('apiary_id,kg_total,price_per_kg'),
        supabase.from('hive_expenses').select('apiary_id,amount'),
        supabase.from('health_treatments').select('apiary_id,cost'),
        supabase.from('visit_logs').select('apiary_id,transport_cost,supply_cost'),
        supabase.from('host_payments').select('apiary_id,amount'),
        supabase.from('transit_logs').select('from_apiary_id,driver_cost,fuel_cost'),
        supabase.from('hives').select('hive_id,apiary_id,status'),
        supabase.from('inspections').select('hive_id,overall_health,check_date').order('check_date', { ascending: false }),
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
      setInspects(ins.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────

  const ids = useMemo(() => scopedIds(apiaries, scope), [apiaries, scope])

  const activeIds = useMemo(
    () => new Set(apiaries.filter(a => !a.season_end).map(a => a.apiary_id)),
    [apiaries]
  )

  const activeHives = useMemo(
    () => hives.filter(h => h.apiary_id && activeIds.has(h.apiary_id) && h.status === 'active').length,
    [hives, activeIds]
  )

  const inScope = (id: string | null) => id !== null && ids.has(id)

  const totalKg = useMemo(
    () => harvests.filter(h => ids.has(h.apiary_id)).reduce((s, h) => s + h.kg_total, 0),
    [harvests, ids]
  )

  const costCategories = useMemo(() => [
    {
      key: 'transport', en: 'Transport', ar: 'نقل وتنقل', color: COST_COLORS[0],
      value: visits.filter(v => inScope(v.apiary_id)).reduce((s, v) => s + (v.transport_cost ?? 0) + (v.supply_cost ?? 0), 0)
           + transits.filter(tr => inScope(tr.from_apiary_id)).reduce((s, tr) => s + (tr.driver_cost ?? 0) + (tr.fuel_cost ?? 0), 0),
    },
    {
      key: 'host', en: 'Host / Land', ar: 'إيجار الأرض', color: COST_COLORS[2],
      value: hostPays.filter(h => inScope(h.apiary_id)).reduce((s, h) => s + h.amount, 0),
    },
    {
      key: 'equipment', en: 'Hive Equipment', ar: 'معدات الخلايا', color: COST_COLORS[3],
      value: hiveExps.filter(e => inScope(e.apiary_id)).reduce((s, e) => s + e.amount, 0),
    },
    {
      key: 'treatments', en: 'Treatments', ar: 'علاجات', color: COST_COLORS[4],
      value: treats.filter(tr => inScope(tr.apiary_id)).reduce((s, tr) => s + (tr.cost ?? 0), 0),
    },
  ].filter(c => c.value > 0), [visits, transits, hostPays, hiveExps, treats, ids])
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const totalCosts = useMemo(() => costCategories.reduce((s, c) => s + c.value, 0), [costCategories])
  const costPerKg  = totalKg > 0 && totalCosts > 0 ? totalCosts / totalKg : null

  const harvestChart = useMemo(() =>
    apiaries.filter(a => ids.has(a.apiary_id)).map(a => ({
      name: a.name.length > 12 ? a.name.slice(0, 12) + '…' : a.name,
      kg:   harvests.filter(h => h.apiary_id === a.apiary_id).reduce((s, h) => s + h.kg_total, 0),
    })),
    [apiaries, harvests, ids]
  )

  const healthChart = useMemo(() => {
    const seen = new Set<string>()
    const latest = inspects.filter(i => { if (seen.has(i.hive_id)) return false; seen.add(i.hive_id); return true })
    return [1, 2, 3, 4, 5].map((score, idx) => ({
      label: score === 5 ? t('Excellent', 'ممتازة') : score === 4 ? t('Good', 'جيدة') : score === 3 ? t('Fair', 'متوسطة') : score === 2 ? t('Poor', 'سيئة') : t('Critical', 'حرجة'),
      count: latest.filter(i => i.overall_health === score).length,
      color: HEALTH_COLORS[idx],
    }))
  }, [inspects, t])

  // ── Render ────────────────────────────────────────────────────────────────

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

  const kpiCards = [
    { icon: '🐝', value: activeHives,                                label: t('Active Hives', 'خلايا نشطة') },
    { icon: '🍯', value: `${fmt(totalKg, 1)} kg`,                   label: t('Total Harvest', 'إجمالي الحصاد') },
    { icon: '💰', value: `$${fmt(totalCosts, 0)}`,                  label: t('Total Costs', 'إجمالي التكاليف') },
    { icon: '📊', value: costPerKg ? `$${fmt(costPerKg, 2)}/kg` : '—', label: t('Cost per kg', 'التكلفة / كغ') },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <Home size={17} />
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold">{t('Almanhal', 'المنحل')} 🍯</h1>
            <p className="text-xs text-gray-400 mt-0.5">{t('Honey Business Dashboard', 'لوحة تحليلات العسل')}</p>
          </div>
          <button onClick={toggle} className="text-xs bg-white/10 px-2.5 py-1 rounded-full hover:bg-white/20 transition-colors font-medium tracking-wide">
            {isAr ? 'EN' : 'AR'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-8">

        {/* Scope tabs */}
        <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
          {SCOPES.map(s => (
            <button key={s.key} onClick={() => setScope(s.key)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                scope === s.key ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              {isAr ? s.ar : s.en}
            </button>
          ))}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          {kpiCards.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-2xl mb-2">{c.icon}</div>
              <div className="text-xl font-bold text-gray-900">{c.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Cost breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t('Cost Breakdown', 'توزيع التكاليف')}
          </h2>
          {costCategories.length === 0
            ? <p className="text-gray-400 text-sm py-6 text-center">{t('No costs recorded for this period', 'لا توجد تكاليف مسجلة لهذه الفترة')}</p>
            : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={costCategories.map(c => ({ name: isAr ? c.ar : c.en, value: c.value }))}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={88} dataKey="value" paddingAngle={2}>
                      {costCategories.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `$${fmt(Number(v), 2)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5 mt-1">
                  {costCategories.map(c => (
                    <div key={c.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-gray-600">{isAr ? c.ar : c.en}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs">
                          {totalCosts > 0 ? `${(c.value / totalCosts * 100).toFixed(0)}%` : '0%'}
                        </span>
                        <span className="font-semibold text-gray-900 tabular-nums">${fmt(c.value, 2)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-bold text-gray-900">
                    <span>{t('Total', 'المجموع')}</span>
                    <span>${fmt(totalCosts, 2)}</span>
                  </div>
                </div>
              </>
            )
          }
        </div>

        {/* Harvest by apiary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t('Harvest by Apiary', 'الحصاد حسب المنحل')}
          </h2>
          {harvestChart.length === 0
            ? <p className="text-gray-400 text-sm py-6 text-center">{t('No apiaries in this period', 'لا توجد مناحل في هذه الفترة')}</p>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={harvestChart} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kg" />
                  <Tooltip formatter={(v) => [`${fmt(Number(v), 1)} kg`, t('Harvest', 'الحصاد')]} />
                  <Bar dataKey="kg" fill="#f59e0b" radius={[4, 4, 0, 0]} name={t('Harvest', 'الحصاد')} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Hive health distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {t('Hive Health Distribution', 'توزيع صحة الخلايا')}
          </h2>
          <p className="text-xs text-gray-400 mb-3">{t('Latest inspection score per hive', 'آخر تقييم لكل خلية')}</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={healthChart} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [Number(v), t('Hives', 'خلايا')]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name={t('Hives', 'خلايا')}>
                {healthChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Navigation */}
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
          {t('Explore', 'استعرض')}
        </h2>
        {[
          { route: '/honey/apiaries', icon: '📍', en: 'Apiaries',       ar: 'المناحل',       den: 'All seasons & campaigns', dar: 'جميع المواسم والحملات' },
          { route: '/honey/hives',    icon: '🐝', en: 'Hives',          ar: 'الخلايا',       den: 'Individual hive history & health', dar: 'تاريخ وصحة الخلايا' },
          { route: '/honey/costs',    icon: '💰', en: 'Cost Analysis',   ar: 'تحليل التكاليف', den: 'Deep cost breakdown', dar: 'تفصيل تكاليف مفصل' },
        ].map(nav => (
          <div key={nav.route} onClick={() => navigate(nav.route)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.99]">
            <div className="text-3xl leading-none shrink-0">{nav.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900">{isAr ? nav.ar : nav.en}</div>
              <div className="text-sm text-gray-400 mt-0.5">{isAr ? nav.dar : nav.den}</div>
            </div>
            <Arrow size={18} className="text-gray-300 shrink-0" />
          </div>
        ))}

      </div>
    </div>
  )
}
