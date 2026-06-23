import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Apiary   { apiary_id: string; name: string; region: string | null; season_start: string | null; season_end: string | null }
interface Harvest  { apiary_id: string; kg_total: number }
interface HiveExp  { apiary_id: string | null; amount: number }
interface Treat    { apiary_id: string | null; cost: number | null }
interface Visit    { apiary_id: string; transport_cost: number | null; supply_cost: number | null }
interface HostPay  { apiary_id: string; amount: number }
interface Transit  { from_apiary_id: string; driver_cost: number | null; fuel_cost: number | null }

type Scope = 'season' | 'year' | 'all'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  transport:  '#f59e0b',
  host:       '#10b981',
  equipment:  '#8b5cf6',
  treatments: '#ef4444',
}

const SCOPES: { key: Scope; en: string; ar: string }[] = [
  { key: 'season', en: 'Season',   ar: 'الموسم' },
  { key: 'year',   en: 'Year',     ar: 'السنة'  },
  { key: 'all',    en: 'All Time', ar: 'الكل'   },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d })

function getScopedIds(apiaries: Apiary[], scope: Scope): Set<string> {
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

function apiaryBreakdown(
  id: string,
  visits: Visit[], hiveExps: HiveExp[], treats: Treat[], hostPays: HostPay[], transits: Transit[]
) {
  return {
    transport: visits.filter(v => v.apiary_id === id).reduce((s, v) => s + (v.transport_cost ?? 0) + (v.supply_cost ?? 0), 0)
             + transits.filter(tr => tr.from_apiary_id === id).reduce((s, tr) => s + (tr.driver_cost ?? 0) + (tr.fuel_cost ?? 0), 0),
    host:      hostPays.filter(h => h.apiary_id === id).reduce((s, h) => s + h.amount, 0),
    equipment: hiveExps.filter(e => e.apiary_id === id).reduce((s, e) => s + e.amount, 0),
    treatments: treats.filter(tr => tr.apiary_id === id).reduce((s, tr) => s + (tr.cost ?? 0), 0),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CostsAnalysis() {
  const navigate = useNavigate()
  const { t, isAr, toggle } = useLang()
  const [scope, setScope]     = useState<Scope>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [hiveExps, setHiveExps] = useState<HiveExp[]>([])
  const [treats,   setTreats]   = useState<Treat[]>([])
  const [visits,   setVisits]   = useState<Visit[]>([])
  const [hostPays, setHostPays] = useState<HostPay[]>([])
  const [transits, setTransits] = useState<Transit[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [a, h, he, tr, v, hp, tl] = await Promise.all([
        supabase.from('apiaries').select('apiary_id,name,region,season_start,season_end').order('season_start', { ascending: false }),
        supabase.from('harvests').select('apiary_id,kg_total'),
        supabase.from('hive_expenses').select('apiary_id,amount'),
        supabase.from('health_treatments').select('apiary_id,cost'),
        supabase.from('visit_logs').select('apiary_id,transport_cost,supply_cost'),
        supabase.from('host_payments').select('apiary_id,amount'),
        supabase.from('transit_logs').select('from_apiary_id,driver_cost,fuel_cost'),
      ])
      if (a.error) { setError(a.error.message); setLoading(false); return }
      setApiaries(a.data ?? [])
      setHarvests(h.data ?? [])
      setHiveExps(he.data ?? [])
      setTreats(tr.data ?? [])
      setVisits(v.data ?? [])
      setHostPays(hp.data ?? [])
      setTransits(tl.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────

  const ids = useMemo(() => getScopedIds(apiaries, scope), [apiaries, scope])

  const scopedApiaries = useMemo(() => apiaries.filter(a => ids.has(a.apiary_id)), [apiaries, ids])

  const perApiary = useMemo(() => scopedApiaries.map(a => {
    const bd = apiaryBreakdown(a.apiary_id, visits, hiveExps, treats, hostPays, transits)
    const total = bd.transport + bd.host + bd.equipment + bd.treatments
    const kg    = harvests.filter(h => h.apiary_id === a.apiary_id).reduce((s, h) => s + h.kg_total, 0)
    return {
      apiary_id: a.apiary_id,
      name: a.name.length > 14 ? a.name.slice(0, 14) + '…' : a.name,
      fullName: a.name,
      season: a.season_start?.slice(0, 7) ?? '—',
      ...bd, total, kg,
      costPerKg: kg > 0 ? total / kg : null,
    }
  }).sort((a, b) => b.total - a.total), [scopedApiaries, visits, hiveExps, treats, hostPays, transits, harvests])

  const totals = useMemo(() => perApiary.reduce(
    (acc, a) => ({
      transport: acc.transport + a.transport,
      host:      acc.host      + a.host,
      equipment: acc.equipment + a.equipment,
      treatments:acc.treatments+ a.treatments,
      total:     acc.total     + a.total,
      kg:        acc.kg        + a.kg,
    }),
    { transport: 0, host: 0, equipment: 0, treatments: 0, total: 0, kg: 0 }
  ), [perApiary])

  const donutData = [
    { name: t('Transport', 'نقل وتنقل'),    value: totals.transport,   color: COLORS.transport  },
    { name: t('Host / Land', 'إيجار الأرض'), value: totals.host,       color: COLORS.host       },
    { name: t('Equipment', 'معدات الخلايا'), value: totals.equipment,  color: COLORS.equipment  },
    { name: t('Treatments', 'علاجات'),       value: totals.treatments, color: COLORS.treatments },
  ].filter(d => d.value > 0)

  const costPerKgChart = perApiary
    .filter(a => a.costPerKg !== null)
    .map(a => ({ name: a.name, value: a.costPerKg! }))

  // ── Render ────────────────────────────────────────────────────────────────

  const dir = isAr ? 'rtl' : 'ltr'

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={dir}><p className="text-gray-400 text-sm">{t('Loading…', 'جاري التحميل…')}</p></div>
  if (error)   return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={dir}><p className="text-red-400 text-sm">{error}</p></div>

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/honey')} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <Home size={17} />
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold">{t('Cost Analysis', 'تحليل التكاليف')} 💰</h1>
            <p className="text-xs text-gray-400 mt-0.5">{t('Track & minimise costs', 'تتبع التكاليف وتخفيضها')}</p>
          </div>
          <button onClick={toggle} className="text-xs bg-white/10 px-2.5 py-1 rounded-full hover:bg-white/20 transition-colors font-medium">
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

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <div className="text-base font-bold text-gray-900">${fmt(totals.total, 0)}</div>
            <div className="text-xs text-gray-400">{t('Total', 'المجموع')}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <div className="text-base font-bold text-amber-600">{fmt(totals.kg, 1)} kg</div>
            <div className="text-xs text-gray-400">{t('Harvested', 'محصود')}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <div className="text-base font-bold text-gray-900">
              {totals.kg > 0 ? `$${fmt(totals.total / totals.kg, 2)}` : '—'}
            </div>
            <div className="text-xs text-gray-400">{t('$/kg', 'تكلفة/كغ')}</div>
          </div>
        </div>

        {/* Total cost breakdown donut */}
        {donutData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {t('Cost by Category', 'التكاليف حسب الفئة')}
            </h2>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} dataKey="value" paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${fmt(v, 2)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-1">
              {donutData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">{totals.total > 0 ? `${(d.value / totals.total * 100).toFixed(0)}%` : '0%'}</span>
                    <span className="font-semibold text-gray-900 tabular-nums">${fmt(d.value, 2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stacked cost by apiary */}
        {perApiary.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {t('Cost by Apiary', 'التكاليف حسب المنحل')}
            </h2>
            <ResponsiveContainer width="100%" height={Math.max(200, perApiary.length * 55)}>
              <BarChart data={perApiary} layout="vertical" margin={{ top: 4, right: 50, bottom: 4, left: isAr ? 10 : 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${fmt(v, 0)}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={isAr ? 100 : 90} />
                <Tooltip formatter={(v: number, name: string) => [`$${fmt(v, 2)}`, name]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="transport"   stackId="s" fill={COLORS.transport}   name={t('Transport', 'نقل')} radius={[0,0,0,0]} />
                <Bar dataKey="host"        stackId="s" fill={COLORS.host}        name={t('Host / Land', 'الأرض')} />
                <Bar dataKey="equipment"   stackId="s" fill={COLORS.equipment}   name={t('Equipment', 'معدات')} />
                <Bar dataKey="treatments"  stackId="s" fill={COLORS.treatments}  name={t('Treatments', 'علاجات')} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost per kg by apiary */}
        {costPerKgChart.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {t('Cost per kg by Apiary', 'التكلفة لكل كغ حسب المنحل')}
            </h2>
            <p className="text-xs text-gray-400 mb-3">{t('Only apiaries with recorded harvests', 'المناحل التي لديها حصاد مسجل فقط')}</p>
            <ResponsiveContainer width="100%" height={Math.max(160, costPerKgChart.length * 50)}>
              <BarChart data={costPerKgChart} layout="vertical" margin={{ top: 4, right: 50, bottom: 4, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${fmt(v, 2)}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => [`$${fmt(v, 2)}/kg`, t('Cost/kg', 'تكلفة/كغ')]} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 3, 3, 0]} name={t('Cost/kg', 'تكلفة/كغ')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary table */}
        {perApiary.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-x-auto">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {t('Summary Table', 'الجدول الملخص')}
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-start py-2 font-medium">{t('Apiary', 'المنحل')}</th>
                  <th className="text-end py-2 font-medium">{t('Total Cost', 'التكلفة')}</th>
                  <th className="text-end py-2 font-medium">{t('Harvest', 'الحصاد')}</th>
                  <th className="text-end py-2 font-medium">{t('$/kg', '$/كغ')}</th>
                </tr>
              </thead>
              <tbody>
                {perApiary.map(a => (
                  <tr key={a.apiary_id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/honey/apiaries/${a.apiary_id}`)}>
                    <td className="py-2.5">
                      <div className="font-medium text-gray-900">{a.fullName}</div>
                      <div className="text-xs text-gray-400">{a.season}</div>
                    </td>
                    <td className="py-2.5 text-end font-semibold text-gray-900">${fmt(a.total, 0)}</td>
                    <td className="py-2.5 text-end text-gray-600">{a.kg > 0 ? `${fmt(a.kg, 1)} kg` : <span className="text-gray-300">—</span>}</td>
                    <td className="py-2.5 text-end">
                      {a.costPerKg != null
                        ? <span className={a.costPerKg > (totals.total / totals.kg) ? 'text-red-500' : 'text-green-600'}>
                            ${fmt(a.costPerKg, 2)}
                          </span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                ))}
                <tr className="font-bold text-gray-900">
                  <td className="py-2.5">{t('Total', 'المجموع')}</td>
                  <td className="py-2.5 text-end">${fmt(totals.total, 0)}</td>
                  <td className="py-2.5 text-end">{fmt(totals.kg, 1)} kg</td>
                  <td className="py-2.5 text-end">{totals.kg > 0 ? `$${fmt(totals.total / totals.kg, 2)}` : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
