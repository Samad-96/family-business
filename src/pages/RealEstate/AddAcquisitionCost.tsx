import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowRight, Save } from 'lucide-react'

const typeOptions = [
  { value: 'notary',       label: 'كاتب العدل' },
  { value: 'registration', label: 'تسجيل' },
  { value: 'agent_fee',    label: 'عمولة وسيط' },
  { value: 'renovation',   label: 'تجديد' },
  { value: 'other',        label: 'أخرى' },
]

export default function AddAcquisitionCost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    type:        'notary',
    amount_usd:  '',
    cost_date:   new Date().toISOString().split('T')[0],
    description: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.amount_usd) { setError('يرجى إدخال المبلغ'); return }

    setSaving(true)
    setError(null)

    const { error } = await supabase.from('acquisition_costs').insert({
      property_id: id,
      type:        form.type,
      amount_usd:  Number(form.amount_usd),
      cost_date:   form.cost_date,
      description: form.description.trim() || null,
    })

    if (error) { setError(error.message); setSaving(false) }
    else navigate(`/real-estate/${id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gray-900 text-white px-4 py-5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/real-estate/${id}`)} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">إضافة تكلفة استحواذ</h1>
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl"
        >
          <Save size={16} />
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{error}</div>}

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">النوع</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full text-gray-900 text-base outline-none bg-transparent">
            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">المبلغ (USD) *</label>
            <input type="number" value={form.amount_usd} onChange={e => set('amount_usd', e.target.value)}
              placeholder="0" className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">التاريخ</label>
            <input type="date" value={form.cost_date} onChange={e => set('cost_date', e.target.value)}
              className="w-full text-gray-900 text-base outline-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">وصف</label>
          <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="تفاصيل إضافية..." className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
        </div>
      </div>
    </div>
  )
}
