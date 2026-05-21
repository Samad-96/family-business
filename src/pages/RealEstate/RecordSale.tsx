import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowRight, Save } from 'lucide-react'

export default function RecordSale() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [propertyLabel, setPropertyLabel] = useState('')

  const [form, setForm] = useState({
    sale_date:      new Date().toISOString().split('T')[0],
    sale_price_usd: '',
    notary_fee_usd: '',
    agent_fee_usd:  '',
    buyer_name:     '',
    notes:          '',
  })

  useEffect(() => {
    supabase.from('properties').select('label').eq('property_id', id).single()
      .then(({ data }) => { if (data) setPropertyLabel(data.label) })
  }, [id])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const salePrice  = Number(form.sale_price_usd)  || 0
  const notaryFee  = Number(form.notary_fee_usd)  || 0
  const agentFee   = Number(form.agent_fee_usd)   || 0
  const netProceeds = salePrice - notaryFee - agentFee

  async function handleSave() {
    if (!form.sale_price_usd) { setError('يرجى إدخال سعر البيع'); return }
    setSaving(true)
    setError(null)

    // Insert sale record and update property status to 'sold'
    const [saleRes] = await Promise.all([
      supabase.from('sales').insert({
        property_id:    id,
        sale_date:      form.sale_date,
        sale_price_usd: salePrice,
        notary_fee_usd: notaryFee,
        agent_fee_usd:  agentFee,
        buyer_name:     form.buyer_name.trim() || null,
        notes:          form.notes.trim()      || null,
      }),
      supabase.from('properties').update({ status: 'sold' }).eq('property_id', id),
    ])

    if (saleRes.error) { setError(saleRes.error.message); setSaving(false) }
    else navigate(`/real-estate/${id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gray-900 text-white px-4 py-5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/real-estate/${id}`)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowRight size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold">تسجيل بيع</h1>
          {propertyLabel && <p className="text-xs text-gray-400 truncate">{propertyLabel}</p>}
        </div>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">سعر البيع (USD) *</label>
            <input type="number" value={form.sale_price_usd} onChange={e => set('sale_price_usd', e.target.value)}
              placeholder="0" className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">تاريخ البيع</label>
            <input type="date" value={form.sale_date} onChange={e => set('sale_date', e.target.value)}
              className="w-full text-gray-900 text-base outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">رسوم كاتب العدل</label>
            <input type="number" value={form.notary_fee_usd} onChange={e => set('notary_fee_usd', e.target.value)}
              placeholder="0" className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">عمولة الوسيط</label>
            <input type="number" value={form.agent_fee_usd} onChange={e => set('agent_fee_usd', e.target.value)}
              placeholder="0" className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
          </div>
        </div>

        {/* Net proceeds live preview */}
        {salePrice > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs text-amber-700 mb-2 font-medium">الصافي المتوقع</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>سعر البيع</span>
                <span>${salePrice.toLocaleString()}</span>
              </div>
              {notaryFee > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>رسوم كاتب العدل</span>
                  <span>- ${notaryFee.toLocaleString()}</span>
                </div>
              )}
              {agentFee > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>عمولة الوسيط</span>
                  <span>- ${agentFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-amber-800 pt-1 border-t border-amber-200">
                <span>الصافي</span>
                <span>${netProceeds.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">اسم المشتري</label>
          <input type="text" value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)}
            placeholder="اختياري" className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">ملاحظات</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="أي تفاصيل إضافية..." rows={3}
            className="w-full text-gray-900 text-base placeholder-gray-300 outline-none resize-none" />
        </div>
      </div>
    </div>
  )
}
