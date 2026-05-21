import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Property } from '../../types'
import { Plus, Home, MapPin, DollarSign, LogOut, ArrowRight } from 'lucide-react'

const statusLabels: Record<string, string> = {
  owned:      'مملوك',
  rented_out: 'مؤجر',
  for_sale:   'للبيع',
  sold:       'مباع',
}

const typeLabels: Record<string, string> = {
  land:     'أرض',
  flat:     'شقة',
  shop:     'محل',
  building: 'بناء',
}

const statusColors: Record<string, string> = {
  owned:      'bg-blue-100 text-blue-800',
  rented_out: 'bg-green-100 text-green-800',
  for_sale:   'bg-amber-100 text-amber-800',
  sold:       'bg-gray-100 text-gray-500',
}

export default function PropertiesList() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) setError(error.message)
      else setProperties(data || [])
      setLoading(false)
    }
    fetchProperties()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="الرئيسية"
            >
              <ArrowRight size={20} />
            </button>
            <button
              onClick={signOut}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut size={17} />
            </button>
            {profile && <span className="text-xs text-gray-400">{profile.name}</span>}
          </div>
          <h1 className="text-xl font-bold tracking-wide">العقارات</h1>
          <button
            onClick={() => navigate('/real-estate/add')}
            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-full p-2 transition-all cursor-pointer"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">

        {loading && (
          <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
            خطأ: {error}
          </div>
        )}

        {!loading && !error && properties.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Home size={52} className="mx-auto mb-4 opacity-20" />
            <p className="text-base">لا توجد عقارات بعد</p>
            <p className="text-sm mt-1 opacity-70">اضغط + لإضافة أول عقار</p>
          </div>
        )}

        {properties.map(property => (
          <div
            key={property.property_id}
            onClick={() => navigate(`/real-estate/${property.property_id}`)}
            className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 text-base truncate">
                  {property.label}
                </h2>
                {property.city && (
                  <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                    <MapPin size={12} />
                    <span>{property.city}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[property.status]}`}>
                  {statusLabels[property.status]}
                </span>
                <span className="text-xs text-gray-400">
                  {typeLabels[property.type]}
                </span>
              </div>
            </div>

            {property.purchase_price_usd != null && (
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50 text-sm text-gray-500">
                <DollarSign size={13} />
                <span>{property.purchase_price_usd.toLocaleString()} USD</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
