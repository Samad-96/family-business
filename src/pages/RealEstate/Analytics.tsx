import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RentPayment { amount_usd: number; status: string; due_date: string }

interface Lease {
  lease_id: string
  monthly_rent_usd: number
  status: string
  start_date: string
  rent_payments: RentPayment[]
}

interface PA {  // PropertyAnalytics shape
  property_id: string
  label: string
  type: string
  status: string
  purchase_date: string | null
  purchase_price_usd: number | null
  size_sqm: number | null
  annual_appreciation_pct: number | null
  acquisition_costs: Array<{ amount_usd: number }>
  maintenance_costs: Array<{ amount_usd: number; cost_date: string }>
  leases: Lease[]
}

// ─── Pure helpers (no hooks) ──────────────────────────────────────────────────

const typeLabels:   Record<string, string> = { flat: 'شقة', shop: 'محل', building: 'بناء', land: 'أرض' }
const statusLabels: Record<string, string> = { owned: 'مملوك', rented_out: 'مؤجر', for_sale: 'للبيع', sold: 'مباع' }
const BAR_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6']

function yearsOwned(purchaseDate: string | null): number {
  if (!purchaseDate) return 0
  return (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 3600 * 1000)
}

function estimatedValue(p: PA): number {
  if (!p.purchase_price_usd) return 0
  const rate = (p.annual_appreciation_pct ?? 5) / 100
  return p.purchase_price_usd * Math.pow(1 + rate, yearsOwned(p.purchase_date))
}

function totalInvested(p: PA): number {
  return (p.purchase_price_usd ?? 0) +
    p.acquisition_costs.reduce((s, c) => s + c.amount_usd, 0)
}

function activeLease(p: PA): Lease | null {
  return p.leases.find(l => l.status === 'active') ?? null
}

function maintenanceLast12(p: PA): number {
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1)
  return p.maintenance_costs
    .filter(c => new Date(c.cost_date) >= cutoff)
    .reduce((s, c) => s + c.amount_usd, 0)
}

function collectedLast12(p: PA): number {
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1)
  const lease = activeLease(p)
  if (!lease) return 0
  return lease.rent_payments
    .filter(pay =>
      new Date(pay.due_date) >= cutoff &&
      (pay.status === 'paid' || pay.status === 'late' || pay.status === 'partial'),
    )
    .reduce((s, pay) => s + pay.amount_usd, 0)
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'income' | 'properties' | 'forecast'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',   label: 'عامة'      },
  { id: 'income',     label: 'الدخل'     },
  { id: 'properties', label: 'العقارات'  },
  { id: 'forecast',   label: 'التوقعات'  },
]

export default function Analytics() {
  const navigate = useNavigate()
  const [props, setProps] = useState<PA[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    supabase
      .from('properties')
      .select(`
        *,
        acquisition_costs (amount_usd),
        maintenance_costs (amount_usd, cost_date),
        leases (
          lease_id, monthly_rent_usd, status, start_date,
          rent_payments (amount_usd, status, due_date)
        )
      `)
      .order('purchase_price_usd', { ascending: false })
      .then(({ data }) => { setProps((data ?? []) as PA[]); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <p className="text-gray-400 text-sm">جاري التحميل...</p>
    </div>
  )

  // ── Portfolio-level metrics ─────────────────────────────────────────────────

  const totalCapital        = props.reduce((s, p) => s + totalInvested(p), 0)
  const totalPurchasePrice  = props.reduce((s, p) => s + (p.purchase_price_usd ?? 0), 0)
  const totalEstValue       = props.reduce((s, p) => s + estimatedValue(p), 0)
  const portfolioGain       = totalEstValue - totalPurchasePrice

  const allActiveLeases     = props.flatMap(p => p.leases.filter(l => l.status === 'active'))
  const monthlyExpected     = allActiveLeases.reduce((s, l) => s + l.monthly_rent_usd, 0)
  const annualExpected      = monthlyExpected * 12
  const annualCollected     = props.reduce((s, p) => s + collectedLast12(p), 0)
  const collectionRate      = annualExpected > 0 ? (annualCollected / annualExpected) * 100 : 0

  const lettable            = props.filter(p => p.type !== 'land')
  const rented              = props.filter(p => p.status === 'rented_out')
  const occupancyRate       = lettable.length > 0 ? (rented.length / lettable.length) * 100 : 0

  const annualMaintTotal    = props.reduce((s, p) => s + maintenanceLast12(p), 0)
  const noi                 = annualCollected - annualMaintTotal
  const capRate             = totalCapital > 0 ? (noi / totalCapital) * 100 : 0

  const idleProps           = props.filter(p => p.status === 'owned' && p.type !== 'land')
  const deadCapital         = idleProps.reduce((s, p) => s + totalInvested(p), 0)
  const avgRent             = rented.length > 0 ? monthlyExpected / rented.length : 0
  const opportunityCost     = idleProps.length * avgRent

  // ── Capital allocation bars ─────────────────────────────────────────────────

  const capitalByType = (['building', 'flat', 'shop', 'land'] as const).map((type, i) => ({
    name:  typeLabels[type],
    value: Math.round(props.filter(p => p.type === type).reduce((s, p) => s + totalInvested(p), 0)),
    color: BAR_COLORS[i],
  })).filter(d => d.value > 0)

  const capitalByStatus = (['rented_out', 'owned', 'for_sale'] as const).map((st, i) => ({
    name:  statusLabels[st],
    value: Math.round(props.filter(p => p.status === st).reduce((s, p) => s + totalInvested(p), 0)),
    color: BAR_COLORS[i],
  })).filter(d => d.value > 0)

  // ── Monthly income trend (last 12 months) ───────────────────────────────────

  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (11 - i))
    const monthStr = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString('ar-EG', { month: 'short' })

    const expected = props.reduce((s, p) => {
      const lease = activeLease(p)
      if (!lease || new Date(lease.start_date) > new Date(monthStr + '-28')) return s
      return s + lease.monthly_rent_usd
    }, 0)

    const actual = props.reduce((s, p) => {
      const lease = activeLease(p)
      if (!lease) return s
      return s + lease.rent_payments
        .filter(pay =>
          pay.due_date.startsWith(monthStr) &&
          (pay.status === 'paid' || pay.status === 'late' || pay.status === 'partial'),
        )
        .reduce((ps, pay) => ps + pay.amount_usd, 0)
    }, 0)

    return { month: label, expected, actual }
  })

  // ── Per-property ROI (rented only) ─────────────────────────────────────────

  const propertyROI = props
    .filter(p => p.status === 'rented_out')
    .map(p => {
      const invested   = totalInvested(p)
      const annualRent = (activeLease(p)?.monthly_rent_usd ?? 0) * 12
      const maint      = maintenanceLast12(p)
      const propNOI    = annualRent - maint
      const cr         = invested > 0 ? (propNOI / invested) * 100 : 0
      const payback    = propNOI > 0 ? invested / propNOI : null
      return { label: p.label, type: p.type, invested, annualRent, maint, noi: propNOI, capRate: cr, payback }
    })
    .sort((a, b) => b.capRate - a.capRate)

  // ── Forecast (next 10 years) ────────────────────────────────────────────────

  const currentYear = new Date().getFullYear()
  const forecastData = Array.from({ length: 11 }, (_, i) => ({
    year: String(currentYear + i),
    value: Math.round(
      props.reduce((s, p) => {
        if (!p.purchase_price_usd) return s
        const rate = (p.annual_appreciation_pct ?? 5) / 100
        return s + p.purchase_price_usd * Math.pow(1 + rate, yearsOwned(p.purchase_date) + i)
      }, 0) / 1000,
    ),
  }))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* Sticky header + tabs */}
      <div className="bg-gray-900 text-white px-4 pt-5 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate('/real-estate')} className="p-1.5 rounded-full hover:bg-white/10">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold flex-1">تحليل العقارات</h1>
        </div>
        <div className="flex gap-1 mt-3 max-w-lg mx-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-12">

        {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="رأس المال المستثمر"     value={fmt(totalCapital)}       sub="شراء + تكاليف استحواذ"          color="amber" />
              <KpiCard label="القيمة السوقية المقدرة" value={fmt(totalEstValue)}      sub={`مكسب ${fmt(portfolioGain)}`}    color="green" />
              <KpiCard label="الدخل الشهري المتوقع"   value={fmt(monthlyExpected)}    sub={`${fmt(annualExpected)} سنوياً`} color="blue"  />
              <KpiCard label="معدل التحصيل"           value={`${collectionRate.toFixed(1)}%`} sub="آخر 12 شهر"
                color={collectionRate >= 90 ? 'green' : collectionRate >= 75 ? 'amber' : 'red'} />
              <KpiCard label="معدل الإشغال"  value={`${occupancyRate.toFixed(1)}%`}
                sub={`${rented.length} من ${lettable.length} وحدة`}
                color={occupancyRate >= 70 ? 'green' : 'amber'} />
              <KpiCard label="معدل العائد الصافي" value={`${capRate.toFixed(2)}%`} sub="NOI ÷ رأس المال"
                color={capRate >= 5 ? 'green' : capRate >= 3 ? 'amber' : 'red'} />
            </div>

            {/* Idle capital alert */}
            {deadCapital > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-amber-800 mb-1">⚠️ رأس مال راكد</p>
                <p className="text-sm text-amber-700">
                  <span className="font-bold">{fmt(deadCapital)}</span> في {idleProps.length} عقار غير مؤجر
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  دخل ضائع مقدر: <span className="font-semibold">{fmt(opportunityCost)}/شهر</span>
                </p>
              </div>
            )}

            {/* Capital by type */}
            <Section title="توزيع رأس المال — النوع">
              {capitalByType.map((d) => (
                <BarRow key={d.name} label={d.name} value={d.value} total={totalCapital} color={d.color} />
              ))}
            </Section>

            {/* Capital by status */}
            <Section title="توزيع رأس المال — الحالة">
              {capitalByStatus.map((d) => (
                <BarRow key={d.name} label={d.name} value={d.value} total={totalCapital} color={d.color} />
              ))}
            </Section>
          </>
        )}

        {/* ══ INCOME ════════════════════════════════════════════════════════════ */}
        {tab === 'income' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <KpiCard label="متوقع/شهر"   value={fmt(monthlyExpected)} color="blue"  />
              <KpiCard label="محصّل (12ش)"  value={fmt(annualCollected)} color="green" />
              <KpiCard label="التحصيل"
                value={`${collectionRate.toFixed(1)}%`}
                color={collectionRate >= 90 ? 'green' : 'amber'} />
            </div>

            {/* Monthly bar chart */}
            <Section title="الدخل الشهري — آخر 12 شهر">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, '']} />
                  <Bar dataKey="expected" name="متوقع"  fill="#e5e7eb" radius={[3,3,0,0]} />
                  <Bar dataKey="actual"   name="محصّل"  fill="#f59e0b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-1">
                <Legend color="#e5e7eb" label="متوقع" />
                <Legend color="#f59e0b" label="محصّل" />
              </div>
            </Section>

            {/* Per-tenant reliability */}
            <Section title="موثوقية المستأجرين">
              {props
                .filter(p => activeLease(p))
                .sort((a, b) => (activeLease(b)?.monthly_rent_usd ?? 0) - (activeLease(a)?.monthly_rent_usd ?? 0))
                .map(p => {
                  const lease = activeLease(p)!
                  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1)
                  const exp12  = lease.monthly_rent_usd * 12
                  const col12  = lease.rent_payments
                    .filter(pay => new Date(pay.due_date) >= cutoff &&
                      (pay.status === 'paid' || pay.status === 'late' || pay.status === 'partial'))
                    .reduce((s, pay) => s + pay.amount_usd, 0)
                  const rate   = exp12 > 0 ? (col12 / exp12) * 100 : 0
                  const issues = lease.rent_payments.filter(pay => pay.status === 'late' || pay.status === 'partial').length

                  return (
                    <div key={p.property_id} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{p.label}</p>
                          <p className="text-xs text-gray-400">
                            ${lease.monthly_rent_usd}/شهر
                            {issues > 0 && <span className="text-orange-400 mr-1"> · {issues} تأخير/جزئي</span>}
                          </p>
                        </div>
                        <span className={`text-xs font-bold mr-3 ${rate >= 90 ? 'text-green-600' : rate >= 75 ? 'text-amber-600' : 'text-red-500'}`}>
                          {rate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${rate >= 90 ? 'bg-green-400' : rate >= 75 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(rate, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
            </Section>
          </>
        )}

        {/* ══ PROPERTIES ════════════════════════════════════════════════════════ */}
        {tab === 'properties' && (
          <>
            <p className="text-xs text-gray-400 px-1">العقارات المؤجرة — مرتبة حسب معدل العائد (Cap Rate)</p>

            {propertyROI.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm font-bold text-gray-900 flex-1 leading-snug">{p.label}</p>
                  <span className={`text-lg font-bold shrink-0 ${p.capRate >= 5 ? 'text-green-600' : p.capRate >= 3 ? 'text-amber-600' : 'text-red-500'}`}>
                    {p.capRate.toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <StatRow label="رأس المال"      value={fmt(p.invested)}   />
                  <StatRow label="الإيجار السنوي" value={fmt(p.annualRent)} />
                  <StatRow label="الصيانة (12ش)"  value={fmt(p.maint)}      />
                  <StatRow label="NOI الصافي"      value={fmt(p.noi)}        highlight />
                  <StatRow label="فترة الاسترداد" value={p.payback ? `${p.payback.toFixed(1)} سنة` : '—'} />
                  <StatRow label="النوع"           value={typeLabels[p.type] ?? p.type} />
                </div>
              </div>
            ))}

            {/* Non-rented properties */}
            <Section title="العقارات غير المؤجرة">
              {props.filter(p => p.status !== 'rented_out').map(p => (
                <div key={p.property_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.label}</p>
                    <p className="text-xs text-gray-400">{typeLabels[p.type]} · {statusLabels[p.status]}</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600 shrink-0 mr-2">{fmt(totalInvested(p))}</p>
                </div>
              ))}
            </Section>
          </>
        )}

        {/* ══ FORECAST ══════════════════════════════════════════════════════════ */}
        {tab === 'forecast' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="القيمة الحالية"  value={fmt(totalEstValue)}              color="amber" />
              <KpiCard label="بعد 10 سنوات"    value={`$${forecastData[10].value}K`}   color="green" />
            </div>

            {/* Value forecast chart */}
            <Section title="توقع قيمة المحفظة — 10 سنوات (بالألف $)">
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={forecastData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number | undefined) => [`$${v ?? 0}K`, 'القيمة']} />
                  <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 text-center mt-1">بناءً على نسبة تقدير مخصصة لكل عقار</p>
            </Section>

            {/* Per-property appreciation table */}
            <Section title="تقدير القيمة الحالية لكل عقار">
              {props
                .filter(p => p.purchase_price_usd)
                .sort((a, b) => estimatedValue(b) - estimatedValue(a))
                .map(p => {
                  const current   = estimatedValue(p)
                  const purchase  = p.purchase_price_usd!
                  const gainPct   = ((current - purchase) / purchase) * 100
                  return (
                    <div key={p.property_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{p.label}</p>
                        <p className="text-xs text-gray-400">
                          {fmt(purchase)} → {fmt(current)} · {p.annual_appreciation_pct ?? 5}%/سنة
                        </p>
                      </div>
                      <span className="text-xs font-bold text-green-600 shrink-0 mr-2">
                        +{gainPct.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
            </Section>

            {/* Annual income forecast */}
            <Section title="توقع الدخل السنوي">
              <p className="text-xs text-gray-400 mb-3">بافتراض نمو الإيجار 3% سنوياً</p>
              {[0, 1, 3, 5, 10].map(yrs => {
                const growth      = Math.pow(1.03, yrs)
                const conservative = monthlyExpected * 12 * growth
                const optimistic  = (monthlyExpected + opportunityCost) * 12 * growth
                return (
                  <div key={yrs} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-xs">
                    <span className="text-gray-500 w-20">{yrs === 0 ? 'الآن' : `+${yrs} سنة`}</span>
                    <span className="text-gray-400">{fmt(conservative)}</span>
                    <span className="font-semibold text-amber-700">{fmt(optimistic)} <span className="text-gray-400 font-normal">تفاؤلي</span></span>
                  </div>
                )
              })}
            </Section>
          </>
        )}

      </div>
    </div>
  )
}

// ─── Small reusable sub-components ────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string
  color: 'amber' | 'green' | 'blue' | 'red'
}) {
  const cls = { amber: 'text-amber-600', green: 'text-green-600', blue: 'text-blue-600', red: 'text-red-500' }
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <p className="text-xs text-gray-400 mb-1 leading-tight">{label}</p>
      <p className={`text-xl font-bold ${cls[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <p className="text-sm font-semibold text-gray-800 mb-3">{title}</p>
      {children}
    </div>
  )
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{fmt(value)} · {pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <>
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${highlight ? 'text-amber-700' : 'text-gray-800'}`}>{value}</span>
    </>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
