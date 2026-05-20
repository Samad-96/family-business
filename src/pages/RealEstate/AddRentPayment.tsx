import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowRight, Save } from 'lucide-react'

const statusOptions = [
  { value: 'paid',    label: 'مدفوع بالكامل' },
  { value: 'partial', label: 'دفع جزئي' },
  { value: 'late',    label: 'متأخر' },
  { value: 'pending', label: 'معلق' },
]

export default function AddRentPayment() {
  const { id, leaseId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [monthlyRent, setMonthlyRent] = useState<number>(0)

  const [form, setForm] = useState({
    due_date:   new Date().toISOString().slice(0, 7) + '-01', // first of current month
    paid_date:  new Date().toISOString().split('T')[0],
    amount_usd: '',
    status:     'paid',
    notes:      '',
  })

  useEffect(() => {
    // Pre-fill amount with monthly rent
    supabase.from('leases').select('monthly_rent_usd').eq('lease_id', leaseId).single()
      .then(({ data }) => {
        if (data) {
          setMonthlyRent(data.monthly_rent_usd)
          setForm(prev => ({ ...prev, amount_usd: String(data.monthly_rent_usd) }))
        }
      })
  }, [leaseId])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.amount_usd) { setError('يرجى إدخال المبلغ'); return }

    setSaving(true)
    setError(null)

    const { error } = await supabase.from('rent_payments').insert({
      lease_id:   leaseId,
      due_date:   form.due_date,
      paid_date:  form.status === 'paid' || form.status === 'partial' ? form.paid_date : null,
      amount_usd: Number(form.amount_usd),
      status:     form.status,
      notes:      form.notes.trim() || null,
    })

    if (error) { setError(error.message); setSaving(false) }
    else navigate(`/real-estate/${id}/lease/${leaseId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gray-900 text-white px-4 py-5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/real-estate/${id}/lease/${leaseId}`)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">تسجيل دفعة إيجار</h1>
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

        {/* Status */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-2 font-medium">حالة الدفعة</label>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => set('status', opt.value)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                  form.status === opt.value
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-amber-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">
            المبلغ (USD)
            {monthlyRent > 0 && <span className="text-amber-500 mr-1">· الإيجار الشهري ${monthlyRent.toLocaleString()}</span>}
          </label>
          <input
            type="number"
            value={form.amount_usd}
            onChange={e => set('amount_usd', e.target.value)}
            className="w-full text-gray-900 text-xl font-bold placeholder-gray-300 outline-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">شهر الإيجار</label>
            <input
              type="month"
              value={form.due_date.slice(0, 7)}
              onChange={e => set('due_date', e.target.value + '-01')}
              className="w-full text-gray-900 text-base outline-none"
            />
          </div>
          {(form.status === 'paid' || form.status === 'partial') && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">تاريخ الدفع</label>
              <input
                type="date"
                value={form.paid_date}
                onChange={e => set('paid_date', e.target.value)}
                className="w-full text-gray-900 text-base outline-none"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">ملاحظات</label>
          <input
            type="text"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="أي تفاصيل إضافية..."
            className="w-full text-gray-900 text-base placeholder-gray-300 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
