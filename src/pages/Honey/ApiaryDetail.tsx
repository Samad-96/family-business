import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Home, ChevronLeft, ChevronRight, Pencil, Trash2, X, Check } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Apiary {
  apiary_id: string; name: string; region: string | null; target_flora: string | null
  host_name: string | null; season_start: string | null; season_end: string | null
  pesticide_risk: string | null; road_access: string | null; water_source: boolean | null
}
interface Hive    { hive_id: string; label: string; status: string; origin: string }
interface Harvest { harvest_id: string; harvest_date: string; kg_total: number; price_per_kg: number | null; notes: string | null }
interface Visit   { visit_id: string; visit_date: string; transport_cost: number | null; supply_cost: number | null; distance_km: number | null; notes: string | null }
interface HostPay { payment_id: string; paid_on: string; amount: number; period_from: string | null; period_to: string | null; notes: string | null }
interface HiveExp { apiary_id: string | null; amount: number }
interface Treat   { apiary_id: string | null; cost: number | null }
interface Transit { from_apiary_id: string; driver_cost: number | null; fuel_cost: number | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d })

const COST_COLORS = ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  dead:   'bg-red-100   text-red-700',
  sold:   'bg-gray-100  text-gray-500',
  merged: 'bg-blue-100  text-blue-700',
}

// ─── Inline field helpers ─────────────────────────────────────────────────────

function Field({ label, value, type = 'text', onChange }: {
  label: string; value: string; type?: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-amber-400" />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApiaryDetail() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { t, isAr, toggle } = useLang()

  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [apiary,   setApiary]   = useState<Apiary | null>(null)
  const [hives,    setHives]    = useState<Hive[]>([])
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [visits,   setVisits]   = useState<Visit[]>([])
  const [hostPays, setHostPays] = useState<HostPay[]>([])
  const [hiveExps, setHiveExps] = useState<HiveExp[]>([])
  const [treats,   setTreats]   = useState<Treat[]>([])
  const [transits, setTransits] = useState<Transit[]>([])

  // edit states
  const [editHarvestId, setEditHarvestId] = useState<string | null>(null)
  const [editH,         setEditH]         = useState<Partial<Harvest>>({})
  const [editVisitId,   setEditVisitId]   = useState<string | null>(null)
  const [editV,         setEditV]         = useState<Partial<Visit>>({})
  const [editHostId,    setEditHostId]    = useState<string | null>(null)
  const [editHP,        setEditHP]        = useState<Partial<HostPay>>({})

  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      const [ap, hv, h, v, hp, he, tr, tl] = await Promise.all([
        supabase.from('apiaries').select('*').eq('apiary_id', id).single(),
        supabase.from('hives').select('hive_id,label,status,origin').eq('apiary_id', id).order('label'),
        supabase.from('harvests').select('harvest_id,harvest_date,kg_total,price_per_kg,notes').eq('apiary_id', id).order('harvest_date', { ascending: false }),
        supabase.from('visit_logs').select('visit_id,visit_date,transport_cost,supply_cost,distance_km,notes').eq('apiary_id', id).order('visit_date', { ascending: false }),
        supabase.from('host_payments').select('payment_id,paid_on,amount,period_from,period_to,notes').eq('apiary_id', id).order('paid_on', { ascending: false }),
        supabase.from('hive_expenses').select('apiary_id,amount').eq('apiary_id', id),
        supabase.from('health_treatments').select('apiary_id,cost').eq('apiary_id', id),
        supabase.from('transit_logs').select('from_apiary_id,driver_cost,fuel_cost').eq('from_apiary_id', id),
      ])
      if (ap.error) { setError(ap.error.message); setLoading(false); return }
      setApiary(ap.data)
      setHives(hv.data ?? [])
      setHarvests(h.data ?? [])
      setVisits(v.data ?? [])
      setHostPays(hp.data ?? [])
      setHiveExps(he.data ?? [])
      setTreats(tr.data ?? [])
      setTransits(tl.data ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  // ── Computed ──────────────────────────────────────────────────────────────

  const totalKg    = harvests.reduce((s, h) => s + h.kg_total, 0)
  const totalValue = harvests.reduce((s, h) => s + h.kg_total * (h.price_per_kg ?? 0), 0)

  const transportCost = visits.reduce((s, v) => s + (v.transport_cost ?? 0) + (v.supply_cost ?? 0), 0)
                      + transits.reduce((s, tr) => s + (tr.driver_cost ?? 0) + (tr.fuel_cost ?? 0), 0)
  const hostRent      = hostPays.reduce((s, h) => s + h.amount, 0)
  const equipCost     = hiveExps.reduce((s, e) => s + e.amount, 0)
  const treatCost     = treats.reduce((s, tr) => s + (tr.cost ?? 0), 0)
  const totalCosts    = transportCost + hostRent + equipCost + treatCost

  const costPieData = [
    { name: t('Transport', 'نقل'),       value: transportCost, color: COST_COLORS[0] },
    { name: t('Host / Land', 'الأرض'),  value: hostRent,      color: COST_COLORS[1] },
    { name: t('Equipment', 'معدات'),     value: equipCost,     color: COST_COLORS[2] },
    { name: t('Treatments', 'علاجات'),   value: treatCost,     color: COST_COLORS[3] },
  ].filter(c => c.value > 0)

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  async function deleteHarvest(harvest_id: string) {
    if (!window.confirm(t('Delete this harvest record?', 'هل تريد حذف سجل الحصاد هذا؟'))) return
    const { error } = await supabase.from('harvests').delete().eq('harvest_id', harvest_id)
    if (error) return alert(error.message)
    setHarvests(prev => prev.filter(h => h.harvest_id !== harvest_id))
  }

  async function saveHarvest() {
    if (!editHarvestId) return
    const { error } = await supabase.from('harvests').update({
      harvest_date: editH.harvest_date,
      kg_total:     editH.kg_total     ? parseFloat(String(editH.kg_total))     : undefined,
      price_per_kg: editH.price_per_kg ? parseFloat(String(editH.price_per_kg)) : null,
      notes:        editH.notes || null,
    }).eq('harvest_id', editHarvestId)
    if (error) return alert(error.message)
    setHarvests(prev => prev.map(h => h.harvest_id === editHarvestId ? { ...h, ...editH } as Harvest : h))
    setEditHarvestId(null)
  }

  async function deleteVisit(visit_id: string) {
    if (!window.confirm(t('Delete this visit?', 'هل تريد حذف هذه الزيارة؟'))) return
    const { error } = await supabase.from('visit_logs').delete().eq('visit_id', visit_id)
    if (error) return alert(error.message)
    setVisits(prev => prev.filter(v => v.visit_id !== visit_id))
  }

  async function saveVisit() {
    if (!editVisitId) return
    const { error } = await supabase.from('visit_logs').update({
      visit_date:     editV.visit_date,
      transport_cost: editV.transport_cost ? parseFloat(String(editV.transport_cost)) : null,
      supply_cost:    editV.supply_cost    ? parseFloat(String(editV.supply_cost))    : null,
      notes:          editV.notes || null,
    }).eq('visit_id', editVisitId)
    if (error) return alert(error.message)
    setVisits(prev => prev.map(v => v.visit_id === editVisitId ? { ...v, ...editV } as Visit : v))
    setEditVisitId(null)
  }

  async function deleteHostPay(payment_id: string) {
    if (!window.confirm(t('Delete this payment?', 'هل تريد حذف هذه الدفعة؟'))) return
    const { error } = await supabase.from('host_payments').delete().eq('payment_id', payment_id)
    if (error) return alert(error.message)
    setHostPays(prev => prev.filter(h => h.payment_id !== payment_id))
  }

  async function saveHostPay() {
    if (!editHostId) return
    const { error } = await supabase.from('host_payments').update({
      paid_on:     editHP.paid_on,
      amount:      editHP.amount ? parseFloat(String(editHP.amount)) : undefined,
      period_from: editHP.period_from || null,
      period_to:   editHP.period_to   || null,
      notes:       editHP.notes || null,
    }).eq('payment_id', editHostId)
    if (error) return alert(error.message)
    setHostPays(prev => prev.map(h => h.payment_id === editHostId ? { ...h, ...editHP } as HostPay : h))
    setEditHostId(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const dir   = isAr ? 'rtl' : 'ltr'
  const Arrow = isAr ? ChevronLeft : ChevronRight

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={dir}><p className="text-gray-400 text-sm">{t('Loading…', 'جاري التحميل…')}</p></div>
  if (error || !apiary) return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={dir}><p className="text-red-400 text-sm">{error ?? t('Not found', 'غير موجود')}</p></div>

  const isActive = !apiary.season_end

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/honey/apiaries')} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <Home size={17} />
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold">{apiary.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{apiary.region ?? t('Apiary Detail', 'تفاصيل المنحل')}</p>
          </div>
          <button onClick={toggle} className="text-xs bg-white/10 px-2.5 py-1 rounded-full hover:bg-white/20 transition-colors font-medium">
            {isAr ? 'EN' : 'AR'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-8">

        {/* Apiary info card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {isActive ? t('Active', 'نشط') : t('Closed', 'منتهي')}
            </span>
            {apiary.target_flora && <span className="text-xs text-amber-600">🌸 {apiary.target_flora}</span>}
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>📅 {apiary.season_start ?? '—'} → {apiary.season_end ?? t('now', 'الآن')}</p>
            {apiary.host_name && <p>👤 {t('Host:', 'صاحب الأرض:')} {apiary.host_name}</p>}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🐝', v: hives.length,           label: t('Hives', 'الخلايا') },
            { icon: '🍯', v: `${fmt(totalKg, 1)} kg`, label: t('Total Harvest', 'إجمالي الحصاد') },
            { icon: '💰', v: `$${fmt(totalCosts, 0)}`, label: t('Total Costs', 'إجمالي التكاليف') },
            { icon: '💵', v: totalValue > 0 ? `$${fmt(totalValue, 0)}` : '—', label: t('Harvest Value', 'قيمة الحصاد') },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
              <div className="text-xl mb-1">{c.icon}</div>
              <div className="text-base font-bold text-gray-900">{c.v}</div>
              <div className="text-xs text-gray-400">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Cost breakdown donut */}
        {costPieData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('Cost Breakdown', 'توزيع التكاليف')}</h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={costPieData} cx="50%" cy="50%" innerRadius={48} outerRadius={78} dataKey="value" paddingAngle={2}>
                  {costPieData.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `$${fmt(Number(v), 2)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {costPieData.map(c => (
                <div key={c.name} className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-gray-600">{c.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">${fmt(c.value, 2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hives list */}
        {hives.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('Hives', 'الخلايا')} ({hives.length})</h2>
            <div className="flex flex-wrap gap-2">
              {hives.map(h => (
                <div key={h.hive_id} onClick={() => navigate(`/honey/hives/${h.hive_id}`)}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 cursor-pointer hover:border-amber-300 transition-colors">
                  <span className="text-sm font-semibold text-gray-900">🐝 {h.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[h.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {t(h.status, h.status === 'active' ? 'نشطة' : h.status === 'dead' ? 'ميتة' : h.status === 'sold' ? 'مباعة' : 'مدمجة')}
                  </span>
                  <Arrow size={12} className="text-gray-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Harvests */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('Harvests', 'الحصاد')} 🍯</h2>
          {harvests.length === 0
            ? <p className="text-gray-400 text-sm">{t('No harvests recorded', 'لا توجد حصادات مسجلة')}</p>
            : (
              <div className="space-y-3">
                {harvests.map(h => (
                  <div key={h.harvest_id} className="border border-gray-100 rounded-xl p-3">
                    {editHarvestId === h.harvest_id ? (
                      <div className="space-y-2">
                        <Field label={t('Date', 'التاريخ')} type="date" value={editH.harvest_date ?? ''} onChange={v => setEditH(p => ({ ...p, harvest_date: v }))} />
                        <Field label={t('kg Total', 'الكمية كغ')} type="number" value={String(editH.kg_total ?? '')} onChange={v => setEditH(p => ({ ...p, kg_total: parseFloat(v) }))} />
                        <Field label={t('Price / kg ($)', 'السعر / كغ ($)')} type="number" value={String(editH.price_per_kg ?? '')} onChange={v => setEditH(p => ({ ...p, price_per_kg: v ? parseFloat(v) : null }))} />
                        <Field label={t('Notes', 'ملاحظات')} value={editH.notes ?? ''} onChange={v => setEditH(p => ({ ...p, notes: v }))} />
                        <div className="flex gap-2 pt-1">
                          <button onClick={saveHarvest} className="flex items-center gap-1 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg"><Check size={12} />{t('Save', 'حفظ')}</button>
                          <button onClick={() => setEditHarvestId(null)} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg"><X size={12} />{t('Cancel', 'إلغاء')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{fmt(h.kg_total, 1)} kg</p>
                          <p className="text-xs text-gray-400">{h.harvest_date} {h.price_per_kg ? `· $${h.price_per_kg}/kg` : ''}</p>
                          {h.notes && <p className="text-xs text-gray-500 mt-1">{h.notes}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditHarvestId(h.harvest_id); setEditH({ ...h }) }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => deleteHarvest(h.harvest_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Visits */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('Visits', 'الزيارات')} 🚗</h2>
          {visits.length === 0
            ? <p className="text-gray-400 text-sm">{t('No visits recorded', 'لا توجد زيارات مسجلة')}</p>
            : (
              <div className="space-y-3">
                {visits.map(v => (
                  <div key={v.visit_id} className="border border-gray-100 rounded-xl p-3">
                    {editVisitId === v.visit_id ? (
                      <div className="space-y-2">
                        <Field label={t('Date', 'التاريخ')} type="date" value={editV.visit_date ?? ''} onChange={val => setEditV(p => ({ ...p, visit_date: val }))} />
                        <Field label={t('Transport Cost ($)', 'تكلفة النقل ($)')} type="number" value={String(editV.transport_cost ?? '')} onChange={val => setEditV(p => ({ ...p, transport_cost: val ? parseFloat(val) : null }))} />
                        <Field label={t('Supply Cost ($)', 'تكلفة المستلزمات ($)')} type="number" value={String(editV.supply_cost ?? '')} onChange={val => setEditV(p => ({ ...p, supply_cost: val ? parseFloat(val) : null }))} />
                        <Field label={t('Notes', 'ملاحظات')} value={editV.notes ?? ''} onChange={val => setEditV(p => ({ ...p, notes: val }))} />
                        <div className="flex gap-2 pt-1">
                          <button onClick={saveVisit} className="flex items-center gap-1 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg"><Check size={12} />{t('Save', 'حفظ')}</button>
                          <button onClick={() => setEditVisitId(null)} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg"><X size={12} />{t('Cancel', 'إلغاء')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-400">{v.visit_date}</p>
                          <p className="text-sm text-gray-900 mt-0.5">
                            {[v.transport_cost ? `🚗 $${fmt(v.transport_cost, 2)}` : null, v.supply_cost ? `🛒 $${fmt(v.supply_cost, 2)}` : null].filter(Boolean).join(' · ') || t('No costs', 'بدون تكاليف')}
                          </p>
                          {v.distance_km && <p className="text-xs text-gray-400 mt-0.5">📏 {v.distance_km} km</p>}
                          {v.notes && <p className="text-xs text-gray-500 mt-1">{v.notes}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditVisitId(v.visit_id); setEditV({ ...v }) }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => deleteVisit(v.visit_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Host Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('Host Payments', 'دفعات صاحب الأرض')} 🏡</h2>
          {hostPays.length === 0
            ? <p className="text-gray-400 text-sm">{t('No payments recorded', 'لا توجد دفعات مسجلة')}</p>
            : (
              <div className="space-y-3">
                {hostPays.map(hp => (
                  <div key={hp.payment_id} className="border border-gray-100 rounded-xl p-3">
                    {editHostId === hp.payment_id ? (
                      <div className="space-y-2">
                        <Field label={t('Paid On', 'تاريخ الدفع')} type="date" value={editHP.paid_on ?? ''} onChange={v => setEditHP(p => ({ ...p, paid_on: v }))} />
                        <Field label={t('Amount ($)', 'المبلغ ($)')} type="number" value={String(editHP.amount ?? '')} onChange={v => setEditHP(p => ({ ...p, amount: parseFloat(v) }))} />
                        <Field label={t('Period From', 'من تاريخ')} type="date" value={editHP.period_from ?? ''} onChange={v => setEditHP(p => ({ ...p, period_from: v || null }))} />
                        <Field label={t('Period To', 'إلى تاريخ')} type="date" value={editHP.period_to ?? ''} onChange={v => setEditHP(p => ({ ...p, period_to: v || null }))} />
                        <Field label={t('Notes', 'ملاحظات')} value={editHP.notes ?? ''} onChange={v => setEditHP(p => ({ ...p, notes: v }))} />
                        <div className="flex gap-2 pt-1">
                          <button onClick={saveHostPay} className="flex items-center gap-1 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg"><Check size={12} />{t('Save', 'حفظ')}</button>
                          <button onClick={() => setEditHostId(null)} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg"><X size={12} />{t('Cancel', 'إلغاء')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">${fmt(hp.amount, 2)}</p>
                          <p className="text-xs text-gray-400">{hp.paid_on}{hp.period_from ? ` · ${hp.period_from} → ${hp.period_to ?? '—'}` : ''}</p>
                          {hp.notes && <p className="text-xs text-gray-500 mt-1">{hp.notes}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditHostId(hp.payment_id); setEditHP({ ...hp }) }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => deleteHostPay(hp.payment_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>

      </div>
    </div>
  )
}
