import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Lease, RentPayment } from '../../types'
import { ArrowRight, Plus, CheckCircle, Clock, AlertCircle, MinusCircle } from 'lucide-react'

const paymentStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  paid:    { label: 'مدفوع',    color: 'bg-green-100 text-green-700',  icon: <CheckCircle size={14} /> },
  pending: { label: 'معلق',     color: 'bg-gray-100 text-gray-500',    icon: <Clock size={14} /> },
  late:    { label: 'متأخر',    color: 'bg-red-100 text-red-600',      icon: <AlertCircle size={14} /> },
  partial: { label: 'جزئي',     color: 'bg-amber-100 text-amber-700',  icon: <MinusCircle size={14} /> },
}

function months(start: string): number {
  const s = new Date(start)
  const now = new Date()
  return Math.max(0, (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth()) + 1)
}

export default function LeaseDetail() {
  const { id, leaseId } = useParams()
  const navigate = useNavigate()

  const [lease, setLease]       = useState<Lease | null>(null)
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [loading, setLoading]   = useState(true)

  async function load() {
    const [leaseRes, paymentsRes] = await Promise.all([
      supabase.from('leases').select('*').eq('lease_id', leaseId).single(),
      supabase.from('rent_payments').select('*').eq('lease_id', leaseId).order('due_date', { ascending: false }),
    ])
    setLease(leaseRes.data)
    setPayments(paymentsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [leaseId])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400" dir="rtl">جاري التحميل...</div>
  if (!lease)  return <div className="min-h-screen flex items-center justify-center text-red-400"  dir="rtl">عقد الإيجار غير موجود</div>

  const monthsElapsed  = months(lease.start_date)
  const totalExpected  = monthsElapsed * lease.monthly_rent_usd
  const totalPaid      = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_usd, 0)
  const totalPartial   = payments.filter(p => p.status === 'partial').reduce((s, p) => s + p.amount_usd, 0)
  const outstanding    = totalExpected - totalPaid - totalPartial

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/real-estate/${id}`)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowRight size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{lease.tenant_name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">${lease.monthly_rent_usd.toLocaleString()} / شهر</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${lease.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {lease.status === 'active' ? 'نشط' : 'منتهي'}
        </span>
      </div>

      <div className="p-4 max-w-lg mx-auto pb-12 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">المتوقع</p>
            <p className="text-sm font-bold text-gray-800">${totalExpected.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">المدفوع</p>
            <p className="text-sm font-bold text-green-600">${(totalPaid + totalPartial).toLocaleString()}</p>
          </div>
          <div className={`rounded-2xl p-3 border shadow-sm text-center ${outstanding > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <p className="text-xs text-gray-400 mb-1">المتبقي</p>
            <p className={`text-sm font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${outstanding.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Lease info */}
        <div className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
          {lease.tenant_phone && (
            <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
              <span className="text-gray-400 text-sm">الهاتف</span>
              <a href={`tel:${lease.tenant_phone}`} className="text-amber-600 text-sm font-medium">{lease.tenant_phone}</a>
            </div>
          )}
          <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span className="text-gray-400 text-sm">بداية العقد</span>
            <span className="text-gray-900 text-sm font-medium">{lease.start_date}</span>
          </div>
          {lease.end_date && (
            <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
              <span className="text-gray-400 text-sm">نهاية العقد</span>
              <span className="text-gray-900 text-sm font-medium">{lease.end_date}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span className="text-gray-400 text-sm">مفروشة</span>
            <span className="text-gray-900 text-sm font-medium">{lease.furnished ? 'نعم' : 'لا'}</span>
          </div>
          {lease.furnishing_cost_usd && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-gray-400 text-sm">تكلفة التأثيث</span>
              <span className="text-gray-900 text-sm font-medium">${lease.furnishing_cost_usd.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Payments */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-gray-700 font-semibold text-sm">سجل الدفعات</span>
            <button
              onClick={() => navigate(`/real-estate/${id}/lease/${leaseId}/add-payment`)}
              className="flex items-center gap-1 text-amber-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-amber-50 active:bg-amber-100 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} /> تسجيل دفعة
            </button>
          </div>

          {payments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">لا توجد دفعات مسجلة بعد</p>
          ) : (
            <div className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
              {payments.map(payment => {
                const config = paymentStatusConfig[payment.status]
                return (
                  <div
                    key={payment.payment_id}
                    onClick={() => navigate(`/real-estate/${id}/lease/${leaseId}/payment/${payment.payment_id}/edit`)}
                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors -mx-4 px-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded-full ${config.color}`}>{config.icon}</span>
                      <div>
                        <p className="text-sm text-gray-800 font-medium">{payment.due_date}</p>
                        {payment.paid_date && (
                          <p className="text-xs text-gray-400">دُفع {payment.paid_date}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">${payment.amount_usd.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
