import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Property, AcquisitionCost, MaintenanceCost, Lease } from '../../types'
import {
  ArrowRight, Calendar, DollarSign,
  Plus, Wrench, FileText, Home, ChevronLeft, Pencil, Banknote
} from 'lucide-react'

const typeLabels: Record<string, string> = {
  land: 'أرض', flat: 'شقة', shop: 'محل', building: 'بناء',
}

const acqTypeLabels: Record<string, string> = {
  notary: 'كاتب العدل', registration: 'تسجيل', agent_fee: 'عمولة وسيط',
  renovation: 'تجديد', other: 'أخرى',
}
const maintCategoryLabels: Record<string, string> = {
  repair: 'إصلاح', cleaning: 'تنظيف', tax: 'ضريبة',
  utilities: 'خدمات', insurance: 'تأمين', other: 'أخرى',
}

function Section({ title, icon, onAdd, children }: {
  title: string
  icon: React.ReactNode
  onAdd?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          {icon}
          <span>{title}</span>
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-amber-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-amber-50 active:bg-amber-100 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={14} /> إضافة
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-900 text-sm font-medium">{value}</span>
    </div>
  )
}

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [property, setProperty]         = useState<Property | null>(null)
  const [acqCosts, setAcqCosts]         = useState<AcquisitionCost[]>([])
  const [maintCosts, setMaintCosts]     = useState<MaintenanceCost[]>([])
  const [leases, setLeases]             = useState<Lease[]>([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const [propRes, acqRes, maintRes, leaseRes] = await Promise.all([
        supabase.from('properties').select('*').eq('property_id', id).single(),
        supabase.from('acquisition_costs').select('*').eq('property_id', id).order('cost_date'),
        supabase.from('maintenance_costs').select('*').eq('property_id', id).order('cost_date', { ascending: false }),
        supabase.from('leases').select('*').eq('property_id', id).order('start_date', { ascending: false }),
      ])
      setProperty(propRes.data)
      setAcqCosts(acqRes.data || [])
      setMaintCosts(maintRes.data || [])
      setLeases(leaseRes.data || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400" dir="rtl">
      جاري التحميل...
    </div>
  )

  if (!property) return (
    <div className="min-h-screen flex items-center justify-center text-red-400" dir="rtl">
      العقار غير موجود
    </div>
  )

  const totalAcq   = acqCosts.reduce((s, c) => s + (c.amount_usd || 0), 0)
  const totalMaint = maintCosts.reduce((s, c) => s + (c.amount_usd || 0), 0)
  const totalInvested = (property.purchase_price_usd || 0) + totalAcq + totalMaint

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-5 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/real-estate')}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowRight size={20} />
        </button>
        <h1 className="text-base font-bold flex-1 truncate">{property.label}</h1>
        <div className="flex items-center gap-2">
          {property.status !== 'sold' && (
            <button
              onClick={() => navigate(`/real-estate/${id}/record-sale`)}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <Banknote size={13} /> بيع
            </button>
          )}
          <button
            onClick={() => navigate(`/real-estate/${id}/edit`)}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Pencil size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto pb-12">

        {/* Property info */}
        <Section title="معلومات العقار" icon={<Home size={15} />}>
          <div className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
            <InfoRow label="النوع"           value={typeLabels[property.type]} />
            <InfoRow label="المدينة"         value={property.city} />
            <InfoRow label="العنوان"         value={property.address} />
            <InfoRow label="المساحة"         value={property.size_sqm ? `${property.size_sqm} م²` : null} />
            <InfoRow label="تاريخ الشراء"   value={property.purchase_date} />
            <InfoRow label="سعر الشراء"     value={property.purchase_price_usd ? `$${property.purchase_price_usd.toLocaleString()}` : null} />
            {property.notes && (
              <div className="py-2.5 text-sm text-gray-500">{property.notes}</div>
            )}
          </div>
        </Section>

        {/* Investment summary */}
        <Section title="ملخص الاستثمار" icon={<DollarSign size={15} />}>
          <div className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
            <InfoRow label="سعر الشراء"        value={`$${(property.purchase_price_usd || 0).toLocaleString()}`} />
            <InfoRow label="تكاليف الاستحواذ"  value={`$${totalAcq.toLocaleString()}`} />
            <InfoRow label="تكاليف الصيانة"    value={`$${totalMaint.toLocaleString()}`} />
            <div className="flex justify-between items-center py-3 font-bold text-gray-900">
              <span>إجمالي الاستثمار</span>
              <span className="text-amber-600">${totalInvested.toLocaleString()}</span>
            </div>
          </div>
        </Section>

        {/* Acquisition costs */}
        <Section
          title="تكاليف الاستحواذ"
          icon={<FileText size={15} />}
          onAdd={() => navigate(`/real-estate/${id}/add-acquisition-cost`)}
        >
          {acqCosts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">لا توجد تكاليف مسجلة</p>
          ) : (
            <div className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
              {acqCosts.map(cost => (
                <div key={cost.cost_id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-800">{acqTypeLabels[cost.type]}</p>
                    {cost.description && <p className="text-xs text-gray-400 mt-0.5">{cost.description}</p>}
                  </div>
                  <span className="text-sm font-medium text-gray-700">${cost.amount_usd.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Maintenance costs */}
        <Section
          title="تكاليف الصيانة"
          icon={<Wrench size={15} />}
          onAdd={() => navigate(`/real-estate/${id}/add-maintenance-cost`)}
        >
          {maintCosts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">لا توجد تكاليف مسجلة</p>
          ) : (
            <div className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
              {maintCosts.map(cost => (
                <div key={cost.maintenance_id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-800">{maintCategoryLabels[cost.category]}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cost.cost_date} {cost.description ? `· ${cost.description}` : ''}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">${cost.amount_usd.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Lease */}
        <Section
          title="الإيجار"
          icon={<Calendar size={15} />}
          onAdd={() => navigate(`/real-estate/${id}/add-lease`)}
        >
          {leases.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">لا يوجد عقد إيجار</p>
          ) : (
            <div className="space-y-2">
              {leases.map(lease => (
                <div
                  key={lease.lease_id}
                  onClick={() => navigate(`/real-estate/${id}/lease/${lease.lease_id}`)}
                  className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{lease.tenant_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ${lease.monthly_rent_usd.toLocaleString()} / شهر · {lease.start_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      lease.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {lease.status === 'active' ? 'نشط' : 'منتهي'}
                    </span>
                    <ChevronLeft size={14} className="text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}
