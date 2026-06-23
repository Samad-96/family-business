import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Home, ChevronLeft, ChevronRight, Pencil, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Hive {
  hive_id: string; label: string; status: string; origin: string
  queen_installed: string | null; apiary_id: string | null
}
interface ApiaryInfo { name: string; region: string | null }
interface Inspection {
  inspection_id: string; check_date: string; overall_health: number | null
  queen_seen: boolean | null; brood_pattern: string | null; honey_stores: string | null
  population_strength: string | null; varroa_count: number | null; notes: string | null
}
interface Treatment {
  treatment_id: string; treated_at: string; product_name: string; method: string | null
  dosage: string | null; duration_days: number | null; cost: number | null; notes: string | null
}
interface Expense {
  expense_id: string; expense_date: string; category: string; amount: number; notes: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d })

const HEALTH_CLS: Record<number, string> = {
  1: 'bg-red-100 text-red-700', 2: 'bg-orange-100 text-orange-700',
  3: 'bg-amber-100 text-amber-700', 4: 'bg-green-100 text-green-700',
  5: 'bg-green-100 text-green-800',
}

const BROOD_MAP: Record<string, string>  = { good: 'ممتاز / Good', fair: 'متوسط / Fair', poor: 'ضعيف / Poor' }
const STORES_MAP: Record<string, string> = { full: 'ممتلئة / Full', partial: 'متوسطة / Partial', low: 'منخفضة / Low', empty: 'فارغة / Empty' }
const STRENGTH_MAP: Record<string, string> = { strong: 'قوية / Strong', medium: 'متوسطة / Medium', weak: 'ضعيفة / Weak' }

const CAT_MAP: Record<string, string> = {
  queen: '👑 ' , swarm_buy: '🐝 ', box: '📦 ', frames_wax: '🖼️ ', wax: '🕯️ ', tools: '🔧 ',
}

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

export default function HiveDetail() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, isAr, toggle } = useLang()

  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [hive,       setHive]       = useState<Hive | null>(null)
  const [apiary,     setApiary]     = useState<ApiaryInfo | null>(null)
  const [inspects,   setInspects]   = useState<Inspection[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [expenses,   setExpenses]   = useState<Expense[]>([])

  // inline edit states
  const [editInsId,  setEditInsId]  = useState<string | null>(null)
  const [editIns,    setEditIns]    = useState<Partial<Inspection>>({})
  const [editTrId,   setEditTrId]   = useState<string | null>(null)
  const [editTr,     setEditTr]     = useState<Partial<Treatment>>({})
  const [editExpId,  setEditExpId]  = useState<string | null>(null)
  const [editExp,    setEditExp]    = useState<Partial<Expense>>({})

  // expand state for inspections
  const [expandedIns, setExpandedIns] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      const [hv, ins, tr, ex] = await Promise.all([
        supabase.from('hives').select('hive_id,label,status,origin,queen_installed,apiary_id').eq('hive_id', id).single(),
        supabase.from('inspections').select('inspection_id,check_date,overall_health,queen_seen,brood_pattern,honey_stores,population_strength,varroa_count,notes').eq('hive_id', id).order('check_date', { ascending: false }),
        supabase.from('health_treatments').select('treatment_id,treated_at,product_name,method,dosage,duration_days,cost,notes').eq('hive_id', id).order('treated_at', { ascending: false }),
        supabase.from('hive_expenses').select('expense_id,expense_date,category,amount,notes').eq('hive_id', id).order('expense_date', { ascending: false }),
      ])
      if (hv.error) { setError(hv.error.message); setLoading(false); return }
      setHive(hv.data)
      setInspects(ins.data ?? [])
      setTreatments(tr.data ?? [])
      setExpenses(ex.data ?? [])

      // Load apiary info if linked
      if (hv.data?.apiary_id) {
        const { data: ap } = await supabase.from('apiaries').select('name,region').eq('apiary_id', hv.data.apiary_id).single()
        if (ap) setApiary(ap)
      }
      setLoading(false)
    }
    load()
  }, [id])

  // ── Computed ──────────────────────────────────────────────────────────────

  const healthChartData = [...inspects]
    .sort((a, b) => a.check_date.localeCompare(b.check_date))
    .filter(i => i.overall_health !== null)
    .map(i => ({ date: i.check_date.slice(5), health: i.overall_health }))

  const totalTreatCost = treatments.reduce((s, tr) => s + (tr.cost ?? 0), 0)
  const totalExpCost   = expenses.reduce((s, e) => s + e.amount, 0)

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function deleteInspection(inspection_id: string) {
    if (!window.confirm(t('Delete this inspection?', 'هل تريد حذف هذا الفحص؟'))) return
    const { error } = await supabase.from('inspections').delete().eq('inspection_id', inspection_id)
    if (error) return alert(error.message)
    setInspects(prev => prev.filter(i => i.inspection_id !== inspection_id))
  }

  async function saveInspection() {
    if (!editInsId) return
    const { error } = await supabase.from('inspections').update({
      check_date:         editIns.check_date,
      overall_health:     editIns.overall_health ?? null,
      queen_seen:         editIns.queen_seen ?? null,
      brood_pattern:      editIns.brood_pattern   || null,
      honey_stores:       editIns.honey_stores     || null,
      population_strength: editIns.population_strength || null,
      varroa_count:       editIns.varroa_count ?? null,
      notes:              editIns.notes || null,
    }).eq('inspection_id', editInsId)
    if (error) return alert(error.message)
    setInspects(prev => prev.map(i => i.inspection_id === editInsId ? { ...i, ...editIns } as Inspection : i))
    setEditInsId(null)
  }

  async function deleteTreatment(treatment_id: string) {
    if (!window.confirm(t('Delete this treatment?', 'هل تريد حذف هذا العلاج؟'))) return
    const { error } = await supabase.from('health_treatments').delete().eq('treatment_id', treatment_id)
    if (error) return alert(error.message)
    setTreatments(prev => prev.filter(tr => tr.treatment_id !== treatment_id))
  }

  async function saveTreatment() {
    if (!editTrId) return
    const { error } = await supabase.from('health_treatments').update({
      treated_at:   editTr.treated_at,
      product_name: editTr.product_name,
      dosage:       editTr.dosage || null,
      method:       editTr.method || null,
      duration_days: editTr.duration_days ?? null,
      cost:         editTr.cost ?? null,
      notes:        editTr.notes || null,
    }).eq('treatment_id', editTrId)
    if (error) return alert(error.message)
    setTreatments(prev => prev.map(tr => tr.treatment_id === editTrId ? { ...tr, ...editTr } as Treatment : tr))
    setEditTrId(null)
  }

  async function deleteExpense(expense_id: string) {
    if (!window.confirm(t('Delete this expense?', 'هل تريد حذف هذا المصروف؟'))) return
    const { error } = await supabase.from('hive_expenses').delete().eq('expense_id', expense_id)
    if (error) return alert(error.message)
    setExpenses(prev => prev.filter(e => e.expense_id !== expense_id))
  }

  async function saveExpense() {
    if (!editExpId) return
    const { error } = await supabase.from('hive_expenses').update({
      expense_date: editExp.expense_date,
      category:     editExp.category,
      amount:       editExp.amount ? parseFloat(String(editExp.amount)) : undefined,
      notes:        editExp.notes || null,
    }).eq('expense_id', editExpId)
    if (error) return alert(error.message)
    setExpenses(prev => prev.map(e => e.expense_id === editExpId ? { ...e, ...editExp } as Expense : e))
    setEditExpId(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const dir   = isAr ? 'rtl' : 'ltr'
  const Arrow = isAr ? ChevronLeft : ChevronRight

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={dir}><p className="text-gray-400 text-sm">{t('Loading…', 'جاري التحميل…')}</p></div>
  if (error || !hive) return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={dir}><p className="text-red-400 text-sm">{error ?? t('Not found', 'غير موجود')}</p></div>

  const toggleExpand = (id: string) => setExpandedIns(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/honey/hives')} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <Home size={17} />
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold">🐝 {t('Hive', 'خلية')} {hive.label}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{apiary ? `📍 ${apiary.name}` : t('Not in an apiary', 'خارج المنحل')}</p>
          </div>
          <button onClick={toggle} className="text-xs bg-white/10 px-2.5 py-1 rounded-full hover:bg-white/20 transition-colors font-medium">
            {isAr ? 'EN' : 'AR'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-8">

        {/* Hive info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hive.status === 'active' ? 'bg-green-100 text-green-700' : hive.status === 'dead' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
              {t(hive.status, hive.status === 'active' ? 'نشطة' : hive.status === 'dead' ? 'ميتة' : hive.status === 'sold' ? 'مباعة' : 'مدمجة')}
            </span>
            <span className="text-xs text-gray-400">
              {t('Origin:', 'المصدر:')} {hive.origin === 'swarm' ? t('Natural swarm', 'طرد طبيعي') : hive.origin === 'bought' ? t('Bought', 'مشتراة') : hive.origin === 'split' ? t('Split', 'تقسيم') : t('Unknown', 'غير معروف')}
            </span>
            {hive.queen_installed && (
              <span className="text-xs text-gray-400">👑 {t('Queen installed:', 'الملكة:')} {hive.queen_installed}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="font-bold text-gray-900">{inspects.length}</div>
              <div className="text-xs text-gray-400">{t('Inspections', 'فحوصات')}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="font-bold text-gray-900">${fmt(totalTreatCost + totalExpCost, 2)}</div>
              <div className="text-xs text-gray-400">{t('Total Costs', 'إجمالي التكاليف')}</div>
            </div>
          </div>
        </div>

        {/* Health trend chart */}
        {healthChartData.length >= 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {t('Health Trend', 'منحنى الصحة')}
            </h2>
            <p className="text-xs text-gray-400 mb-3">{t('Overall health score over inspections (1–5)', 'تقييم الصحة العامة عبر الزمن (١–٥)')}</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={healthChartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v, t('Health', 'الصحة')]} />
                <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="health" stroke="#f59e0b" strokeWidth={2.5}
                  dot={{ fill: '#f59e0b', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} name={t('Health', 'الصحة')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Inspections */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t('Inspections', 'الفحوصات')} ({inspects.length})
          </h2>
          {inspects.length === 0
            ? <p className="text-gray-400 text-sm">{t('No inspections recorded', 'لا توجد فحوصات مسجلة')}</p>
            : (
              <div className="space-y-3">
                {inspects.map(ins => (
                  <div key={ins.inspection_id} className="border border-gray-100 rounded-xl p-3">
                    {editInsId === ins.inspection_id ? (
                      <div className="space-y-2">
                        <Field label={t('Date', 'التاريخ')} type="date" value={editIns.check_date ?? ''} onChange={v => setEditIns(p => ({ ...p, check_date: v }))} />
                        <div>
                          <label className="text-xs text-gray-400 block mb-0.5">{t('Overall Health (1–5)', 'الصحة العامة (١–٥)')}</label>
                          <div className="flex gap-1.5">
                            {[1,2,3,4,5].map(n => (
                              <button key={n} onClick={() => setEditIns(p => ({ ...p, overall_health: n }))}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${editIns.overall_health === n ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-500 hover:border-amber-300'}`}>{n}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-0.5">{t('Queen Seen', 'الملكة موجودة')}</label>
                          <div className="flex gap-2">
                            {[true, false].map(v => (
                              <button key={String(v)} onClick={() => setEditIns(p => ({ ...p, queen_seen: v }))}
                                className={`px-3 py-1 rounded-lg text-xs border transition-colors ${editIns.queen_seen === v ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-500'}`}>
                                {v ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Field label={t('Varroa Count', 'عدد الفاروا')} type="number" value={String(editIns.varroa_count ?? '')} onChange={v => setEditIns(p => ({ ...p, varroa_count: v ? parseInt(v) : null }))} />
                        <Field label={t('Notes', 'ملاحظات')} value={editIns.notes ?? ''} onChange={v => setEditIns(p => ({ ...p, notes: v }))} />
                        <div className="flex gap-2 pt-1">
                          <button onClick={saveInspection} className="flex items-center gap-1 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg"><Check size={12} />{t('Save', 'حفظ')}</button>
                          <button onClick={() => setEditInsId(null)} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg"><X size={12} />{t('Cancel', 'إلغاء')}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{ins.check_date}</span>
                              {ins.overall_health && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${HEALTH_CLS[ins.overall_health] ?? ''}`}>
                                  ❤️ {ins.overall_health}/5
                                </span>
                              )}
                              {ins.queen_seen && <span className="text-xs text-amber-600">👑</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleExpand(ins.inspection_id)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 transition-colors">
                              {expandedIns.has(ins.inspection_id) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                            <button onClick={() => { setEditInsId(ins.inspection_id); setEditIns({ ...ins }) }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"><Pencil size={13} /></button>
                            <button onClick={() => deleteInspection(ins.inspection_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {expandedIns.has(ins.inspection_id) && (
                          <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5 text-xs text-gray-500">
                            {ins.brood_pattern && <span>🥚 {BROOD_MAP[ins.brood_pattern] ?? ins.brood_pattern}</span>}
                            {ins.honey_stores && <span>🍯 {STORES_MAP[ins.honey_stores] ?? ins.honey_stores}</span>}
                            {ins.population_strength && <span>💪 {STRENGTH_MAP[ins.population_strength] ?? ins.population_strength}</span>}
                            {ins.varroa_count != null && <span>🔬 {t('Varroa:', 'فاروا:')} {ins.varroa_count}</span>}
                            {ins.notes && <span className="col-span-2 text-gray-400 italic">{ins.notes}</span>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Treatments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t('Treatments', 'العلاجات')} 💊 {totalTreatCost > 0 && <span className="text-gray-400 normal-case font-normal">· ${fmt(totalTreatCost, 2)}</span>}
          </h2>
          {treatments.length === 0
            ? <p className="text-gray-400 text-sm">{t('No treatments recorded', 'لا توجد علاجات مسجلة')}</p>
            : (
              <div className="space-y-3">
                {treatments.map(tr => (
                  <div key={tr.treatment_id} className="border border-gray-100 rounded-xl p-3">
                    {editTrId === tr.treatment_id ? (
                      <div className="space-y-2">
                        <Field label={t('Date', 'التاريخ')} type="date" value={editTr.treated_at ?? ''} onChange={v => setEditTr(p => ({ ...p, treated_at: v }))} />
                        <Field label={t('Product', 'المنتج')} value={editTr.product_name ?? ''} onChange={v => setEditTr(p => ({ ...p, product_name: v }))} />
                        <Field label={t('Dosage', 'الجرعة')} value={editTr.dosage ?? ''} onChange={v => setEditTr(p => ({ ...p, dosage: v }))} />
                        <Field label={t('Duration (days)', 'المدة (أيام)')} type="number" value={String(editTr.duration_days ?? '')} onChange={v => setEditTr(p => ({ ...p, duration_days: v ? parseInt(v) : null }))} />
                        <Field label={t('Cost ($)', 'التكلفة ($)')} type="number" value={String(editTr.cost ?? '')} onChange={v => setEditTr(p => ({ ...p, cost: v ? parseFloat(v) : null }))} />
                        <Field label={t('Notes', 'ملاحظات')} value={editTr.notes ?? ''} onChange={v => setEditTr(p => ({ ...p, notes: v }))} />
                        <div className="flex gap-2 pt-1">
                          <button onClick={saveTreatment} className="flex items-center gap-1 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg"><Check size={12} />{t('Save', 'حفظ')}</button>
                          <button onClick={() => setEditTrId(null)} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg"><X size={12} />{t('Cancel', 'إلغاء')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{tr.product_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {tr.treated_at}{tr.method ? ` · ${tr.method}` : ''}{tr.duration_days ? ` · ${tr.duration_days}d` : ''}{tr.cost ? ` · $${fmt(tr.cost, 2)}` : ''}
                          </p>
                          {tr.dosage && <p className="text-xs text-gray-500 mt-0.5">{tr.dosage}</p>}
                          {tr.notes && <p className="text-xs text-gray-400 mt-1 italic">{tr.notes}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditTrId(tr.treatment_id); setEditTr({ ...tr }) }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => deleteTreatment(tr.treatment_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t('Expenses', 'المصاريف')} 💰 {totalExpCost > 0 && <span className="text-gray-400 normal-case font-normal">· ${fmt(totalExpCost, 2)}</span>}
          </h2>
          {expenses.length === 0
            ? <p className="text-gray-400 text-sm">{t('No expenses recorded', 'لا توجد مصاريف مسجلة')}</p>
            : (
              <div className="space-y-3">
                {expenses.map(ex => (
                  <div key={ex.expense_id} className="border border-gray-100 rounded-xl p-3">
                    {editExpId === ex.expense_id ? (
                      <div className="space-y-2">
                        <Field label={t('Date', 'التاريخ')} type="date" value={editExp.expense_date ?? ''} onChange={v => setEditExp(p => ({ ...p, expense_date: v }))} />
                        <Field label={t('Amount ($)', 'المبلغ ($)')} type="number" value={String(editExp.amount ?? '')} onChange={v => setEditExp(p => ({ ...p, amount: parseFloat(v) }))} />
                        <Field label={t('Notes', 'ملاحظات')} value={editExp.notes ?? ''} onChange={v => setEditExp(p => ({ ...p, notes: v }))} />
                        <div className="flex gap-2 pt-1">
                          <button onClick={saveExpense} className="flex items-center gap-1 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg"><Check size={12} />{t('Save', 'حفظ')}</button>
                          <button onClick={() => setEditExpId(null)} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg"><X size={12} />{t('Cancel', 'إلغاء')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {CAT_MAP[ex.category] ?? ''}{ex.category} · ${fmt(ex.amount, 2)}
                          </p>
                          <p className="text-xs text-gray-400">{ex.expense_date}</p>
                          {ex.notes && <p className="text-xs text-gray-500 mt-1">{ex.notes}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditExpId(ex.expense_id); setEditExp({ ...ex }) }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => deleteExpense(ex.expense_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={13} /></button>
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
