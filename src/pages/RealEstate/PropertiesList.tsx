import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Home, LogOut, ArrowRight, BarChart2, ChevronLeft, ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyRow {
  property_id: string
  label: string
  type: string
  status: string
  city: string | null
  size_sqm: number | null
  purchase_price_usd: number | null
  leases: Array<{ monthly_rent_usd: number; status: string }>
}

// ─── Config ───────────────────────────────────────────────────────────────────

const GROUPS = [
  { status: 'rented_out', label: 'مؤجر',  headerCls: 'bg-green-600', },
  { status: 'owned',      label: 'شاغر',  headerCls: 'bg-blue-600',  },
  { status: 'for_sale',   label: 'للبيع', headerCls: 'bg-amber-500', },
  { status: 'sold',       label: 'مباع',  headerCls: 'bg-gray-500',  },
] as const

function effectiveStatus(p: PropertyRow): string {
  if (p.leases.some(l => l.status === 'active')) return 'rented_out'
  if (p.status === 'rented_out') return 'owned'
  return p.status
}

const TYPE_ORDER = ['building', 'flat', 'shop', 'land']

const typeLabels: Record<string, string> = {
  building: 'بناء', flat: 'شقة', shop: 'محل', land: 'أرض',
}

const typeCls: Record<string, string> = {
  building: 'bg-purple-100 text-purple-700',
  flat:     'bg-blue-100   text-blue-700',
  shop:     'bg-amber-100  text-amber-700',
  land:     'bg-green-100  text-green-700',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertiesList() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [properties, setProperties]   = useState<PropertyRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [collapsed, setCollapsed]     = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase
      .from('properties')
      .select('property_id, label, type, status, city, size_sqm, purchase_price_usd, leases(monthly_rent_usd, status)')
      .order('label')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setProperties((data ?? []) as PropertyRow[])
        setLoading(false)
      })
  }, [])

  function toggleGroup(status: string) {
    setCollapsed(prev => ({ ...prev, [status]: !prev[status] }))
  }

  // Summary
  const totalMonthlyIncome = properties
    .flatMap(p => p.leases.filter(l => l.status === 'active'))
    .reduce((s, l) => s + l.monthly_rent_usd, 0)
  const rentedCount = properties.filter(p => p.leases.some(l => l.status === 'active')).length

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Left controls (RTL: visual right) */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/')}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors" title="الرئيسية">
              <ArrowRight size={20} />
            </button>
            <button onClick={signOut}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors" title="تسجيل الخروج">
              <LogOut size={17} />
            </button>
            {profile && <span className="text-xs text-gray-400">{profile.name}</span>}
          </div>

          <h1 className="text-xl font-bold tracking-wide">العقارات</h1>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/real-estate/analytics')}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors" title="التحليلات">
              <BarChart2 size={20} />
            </button>
            <button onClick={() => navigate('/real-estate/add')}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-full p-2 transition-all">
              <Plus size={22} />
            </button>
          </div>
        </div>

        {/* Summary strip */}
        {!loading && properties.length > 0 && (
          <div className="flex items-center justify-between mt-2.5 px-1 max-w-lg mx-auto">
            <div className="flex gap-3 text-xs text-gray-400">
              <span><span className="text-white font-semibold">{properties.length}</span> عقار</span>
              <span><span className="text-green-400 font-semibold">{rentedCount}</span> مؤجر</span>
            </div>
            <span className="text-xs text-gray-400">
              دخل شهري: <span className="text-amber-400 font-semibold">${totalMonthlyIncome.toLocaleString()}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto pb-12">

        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">جاري التحميل...</div>
        )}

        {error && (
          <div className="m-4 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
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

        {GROUPS.map(group => {
          // Sort within group: building → flat → shop → land, then alphabetically
          const groupProps = properties
            .filter(p => effectiveStatus(p) === group.status)
            .sort((a, b) =>
              TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
              a.label.localeCompare(b.label, 'ar'),
            )

          if (groupProps.length === 0) return null

          const isCollapsed = !!collapsed[group.status]

          const groupMonthlyIncome = group.status === 'rented_out'
            ? groupProps
                .flatMap(p => p.leases.filter(l => l.status === 'active'))
                .reduce((s, l) => s + l.monthly_rent_usd, 0)
            : null

          return (
            <div key={group.status} className="mt-4 mx-4">

              {/* Group header — tappable to collapse */}
              <button
                onClick={() => toggleGroup(group.status)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl ${group.headerCls} text-white cursor-pointer`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{group.label}</span>
                  <span className="bg-white/25 text-xs px-2 py-0.5 rounded-full font-medium">
                    {groupProps.length}
                  </span>
                  {groupMonthlyIncome != null && (
                    <span className="text-xs text-white/80">
                      ${groupMonthlyIncome.toLocaleString()}/شهر
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                />
              </button>

              {/* Property rows */}
              {!isCollapsed && (
                <div className="bg-white rounded-2xl mt-1.5 border border-gray-100 shadow-sm overflow-hidden">
                  {groupProps.map((p, idx) => {
                    const activeLease = p.leases.find(l => l.status === 'active')

                    // Choose the most meaningful metric per status
                    let metric: string | null = null
                    if (group.status === 'rented_out' && activeLease) {
                      metric = `$${activeLease.monthly_rent_usd.toLocaleString()}/شهر`
                    } else if (p.purchase_price_usd) {
                      metric = `$${(p.purchase_price_usd / 1000).toFixed(0)}K`
                    }

                    return (
                      <div
                        key={p.property_id}
                        onClick={() => navigate(`/real-estate/${p.property_id}`)}
                        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer
                          active:bg-gray-50 hover:bg-gray-50 transition-colors
                          ${idx < groupProps.length - 1 ? 'border-b border-gray-50' : ''}`}
                      >
                        {/* Type badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium shrink-0 ${typeCls[p.type]}`}>
                          {typeLabels[p.type]}
                        </span>

                        {/* Name + city · size */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.label}</p>
                          {(p.city || p.size_sqm) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {p.city}{p.size_sqm ? ` · ${p.size_sqm} م²` : ''}
                            </p>
                          )}
                        </div>

                        {/* Metric + forward chevron */}
                        <div className="flex items-center gap-1 shrink-0">
                          {metric && (
                            <span className="text-xs font-semibold text-gray-600">{metric}</span>
                          )}
                          <ChevronLeft size={14} className="text-gray-300" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
