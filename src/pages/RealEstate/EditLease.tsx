import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowRight, Save } from 'lucide-react'

export default function EditLease() {
  const { id, leaseId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    tenant_name:         '',
    tenant_phone:        '',
    start_date:          '',
    end_date:            '',
    monthly_rent_usd:    '',
    furnished:           false,
    furnishing_cost_usd: '',
    notes:               '',
  })

  useEffect(() => {
    supabase.from('leases').select('*').eq('lease_id', leaseId).single()
      .then(({ data }) => {
        if (data) setForm({
          tenant_name:         data.tenant_name,
          tenant_phone:        data.tenant_phone        || '',
          start_date:          data.start_date,
          end_date:            data.end_date            || '',
          monthly_rent_usd:    String(data.monthly_rent_usd),
          furnished:           data.furnished,
          furnishing_cost_usd: data.furnishing_cost_usd ? String(data.furnishing_cost_usd) : '',
          notes:               data.notes               || '',
        })
        setLoading(false)
      })
  }, [leaseId])

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.tenant_name.trim()) { setError('يرجى إدخال اسم المستأجر'); return }
    if (!form.monthly_rent_usd)   { setError('يرجى إدخال قيمة الإيجار الشهري'); return }
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('leases').update({
      changed_by:          session?.user.id,
      tenant_name:         form.tenant_name.trim(),
      tenant_phone:        form.tenant_phone.trim()        || null,
      start_date:          form.start_date,
      end_date:            form.end_date                   || null,
      monthly_rent_usd:    Number(form.monthly_rent_usd),
      furnished:           form.furnished,
      furnishing_cost_usd: form.furnishing_cost_usd        ? Number(form.furnishing_cost_usd) : null,
      notes:               form.notes.trim()               || null,
    }).eq('lease_id', leaseId)

    if (error) { setError(error.message); setSaving(false) }
    else navigate(`/real-estate/${id}/lease/${leaseId}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400" dir="rtl">
      جاري التحميل...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gray-900 text-white px-4 py-5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/real-estate/${id}/lease/${leaseId}`)}
          className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">تعديل العقد</h1>
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Save size={16} />
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">اسم المستأجر *</label>
          <input type="text" value={form.tenant_name} onChange={e => set('tenant_name', e.target.value)}
            className="w-full text-gray-900 text-base outline-none" />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">رقم الهاتف</label>
          <input type="tel" value={form.tenant_phone} onChange={e => set('tenant_phone', e.target.value)}
            placeholder="+963..." className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">تاريخ البداية</label>
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
              className="w-full text-gray-900 text-base outline-none" />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">تاريخ الانتهاء</label>
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
              className="w-full text-gray-900 text-base outline-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">الإيجار الشهري (USD) *</label>
          <input type="number" value={form.monthly_rent_usd} onChange={e => set('monthly_rent_usd', e.target.value)}
            className="w-full text-gray-900 text-xl font-bold outline-none" />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">مفروشة</p>
            <p className="text-xs text-gray-400 mt-0.5">هل الوحدة مؤجرة مفروشة؟</p>
          </div>
          <button
            onClick={() => set('furnished', !form.furnished)}
            className={`w-12 h-6 rounded-full transition-colors relative ${form.furnished ? 'bg-amber-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.furnished ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>

        {form.furnished && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">تكلفة التأثيث (USD)</label>
            <input type="number" value={form.furnishing_cost_usd} onChange={e => set('furnishing_cost_usd', e.target.value)}
              placeholder="0" className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
          </div>
        )}

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
