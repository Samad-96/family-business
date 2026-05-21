import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowRight, Save, Trash2 } from 'lucide-react'

const typeOptions = [
  { value: 'flat',     label: 'شقة' },
  { value: 'shop',     label: 'محل' },
  { value: 'land',     label: 'أرض' },
  { value: 'building', label: 'بناء' },
]

const statusOptions = [
  { value: 'owned',      label: 'مملوك' },
  { value: 'rented_out', label: 'مؤجر' },
  { value: 'for_sale',   label: 'للبيع' },
  { value: 'sold',       label: 'مباع' },
]

export default function EditProperty() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    label:              '',
    type:               'flat',
    city:               '',
    address:            '',
    size_sqm:           '',
    status:             'owned',
    purchase_date:      '',
    purchase_price_usd: '',
    notes:              '',
  })

  useEffect(() => {
    supabase.from('properties').select('*').eq('property_id', id).single()
      .then(({ data }) => {
        if (data) setForm({
          label:              data.label,
          type:               data.type,
          city:               data.city               || '',
          address:            data.address            || '',
          size_sqm:           data.size_sqm           != null ? String(data.size_sqm)           : '',
          status:             data.status,
          purchase_date:      data.purchase_date      || '',
          purchase_price_usd: data.purchase_price_usd != null ? String(data.purchase_price_usd) : '',
          notes:              data.notes              || '',
        })
        setLoading(false)
      })
  }, [id])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.label.trim()) { setError('يرجى إدخال اسم العقار'); return }
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('properties').update({
      label:              form.label.trim(),
      type:               form.type,
      city:               form.city.trim()               || null,
      address:            form.address.trim()            || null,
      size_sqm:           form.size_sqm                  ? Number(form.size_sqm)           : null,
      status:             form.status,
      purchase_date:      form.purchase_date             || null,
      purchase_price_usd: form.purchase_price_usd        ? Number(form.purchase_price_usd) : null,
      notes:              form.notes.trim()              || null,
    }).eq('property_id', id)

    if (error) { setError(error.message); setSaving(false) }
    else navigate(`/real-estate/${id}`)
  }

  async function handleDelete() {
    if (!confirm('هل أنت متأكد من حذف هذا العقار؟ سيتم حذف جميع البيانات المرتبطة به.')) return
    await supabase.from('properties').delete().eq('property_id', id)
    navigate('/real-estate')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400" dir="rtl">جاري التحميل...</div>

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gray-900 text-white px-4 py-5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/real-estate/${id}`)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">تعديل العقار</h1>
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

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">اسم العقار *</label>
          <input type="text" value={form.label} onChange={e => set('label', e.target.value)}
            placeholder="مثال: محل الوسطى - اللاذقية"
            className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">النوع</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full text-gray-900 text-base outline-none bg-transparent">
              {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">الحالة</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full text-gray-900 text-base outline-none bg-transparent">
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">المدينة</label>
            <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
              placeholder="اللاذقية" className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">المساحة (م²)</label>
            <input type="number" value={form.size_sqm} onChange={e => set('size_sqm', e.target.value)}
              placeholder="120" className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">العنوان التفصيلي</label>
          <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
            placeholder="الحي، الشارع، رقم البناء..."
            className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">سعر الشراء (USD)</label>
            <input type="number" value={form.purchase_price_usd} onChange={e => set('purchase_price_usd', e.target.value)}
              placeholder="0" className="w-full text-gray-900 text-base placeholder-gray-300 outline-none" />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">تاريخ الشراء</label>
            <input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)}
              className="w-full text-gray-900 text-base outline-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium">ملاحظات</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="أي معلومات إضافية..." rows={3}
            className="w-full text-gray-900 text-base placeholder-gray-300 outline-none resize-none" />
        </div>

        <button onClick={handleDelete}
          className="w-full py-3 flex items-center justify-center gap-2 text-red-500 text-sm font-medium hover:bg-red-50 rounded-2xl border border-red-100 transition-colors cursor-pointer">
          <Trash2 size={15} />
          حذف هذا العقار
        </button>
      </div>
    </div>
  )
}
