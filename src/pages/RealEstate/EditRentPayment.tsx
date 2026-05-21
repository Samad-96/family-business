import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowRight, Save } from 'lucide-react'

const statusOptions = [
  { value: 'paid',    label: 'مدفوع',          hint: 'استُلم المبلغ كاملاً' },
  { value: 'partial', label: 'دفع جزئي',        hint: 'استُلم جزء من المبلغ' },
  { value: 'late',    label: 'متأخر (لم يُدفع)', hint: 'لم يُستلم بعد وقد تأخر' },
  { value: 'pending', label: 'معلق',             hint: 'لم يحن موعده بعد' },
]

export default function EditRentPayment() {
  const { id, leaseId, paymentId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    due_date:   '',
    paid_date:  '',
    amount_usd: '',
    status:     'paid',
    notes:      '',
  })

  useEffect(() => {
    supabase.from('rent_payments').select('*').eq('payment_id', paymentId).single()
      .then(({ data }) => {
        if (data) setForm({
          due_date:   data.due_date,
          paid_date:  data.paid_date || new Date().toISOString().split('T')[0],
          amount_usd: String(data.amount_usd),
          status:     data.status,
          notes:      data.notes || '',
        })
        setLoading(false)
      })
  }, [paymentId])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.amount_usd) { setError('يرجى إدخال المبلغ'); return }
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('rent_payments').update({
      changed_by: session?.user.id,
      due_date:  form.due_date,
      paid_date: (form.status === 'paid' || form.status === 'partial') ? form.paid_date : null,
      amount_usd: Number(form.amount_usd),
      status:    form.status,
      notes:     form.notes.trim() || null,
    }).eq('payment_id', paymentId)

    if (error) { setError(error.message); setSaving(false) }
    else navigate(`/real-estate/${id}/lease/${leaseId}`)
  }

  async function handleDelete() {
    if (!confirm('هل تريد حذف هذه الدفعة؟')) return
    await supabase.from('rent_payments').delete().eq('payment_id', paymentId)
    navigate(`/real-estate/${id}/lease/${leaseId}`)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400" dir="rtl">جاري التحميل...</div>

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gray-900 text-white px-4 py-5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/real-estate/${id}/lease/${leaseId}`)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">تعديل الدفعة</h1>
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Save size={16} />
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{error}</div>}

        {/* Status — full explanation for each option */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-2 font-medium">حالة الدفعة</label>
          <div className="space-y-2">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => set('status', opt.value)}
                className={`w-full text-right flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                  form.status === opt.value
                    ? 'bg-amber-50 border-amber-400'
                    : 'bg-gray-50 border-gray-100 hover:border-amber-200'
                }`}
              >
                <span className="text-xs text-gray-400">{opt.hint}</span>
                <span className={`text-sm font-medium ${form.status === opt.value ? 'text-amber-700' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">المبلغ (USD)</label>
          <input
            type="number" value={form.amount_usd} onChange={e => set('amount_usd', e.target.value)}
            className="w-full text-gray-900 text-xl font-bold placeholder-gray-300 outline-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">شهر الإيجار</label>
            <input
              type="month" value={form.due_date.slice(0, 7)}
              onChange={e => set('due_date', e.target.value + '-01')}
              className="w-full text-gray-900 text-base outline-none"
            />
          </div>
          {(form.status === 'paid' || form.status === 'partial') && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">تاريخ الاستلام</label>
              <input
                type="date" value={form.paid_date} onChange={e => set('paid_date', e.target.value)}
                className="w-full text-gray-900 text-base outline-none"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">ملاحظات</label>
          <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="أي تفاصيل إضافية..." className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="w-full py-3 text-red-500 text-sm font-medium hover:bg-red-50 rounded-2xl border border-red-100 transition-colors cursor-pointer"
        >
          حذف هذه الدفعة
        </button>
      </div>
    </div>
  )
}
