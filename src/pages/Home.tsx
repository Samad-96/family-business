import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Lock, ChevronLeft } from 'lucide-react'

const BUSINESSES = [
  {
    id:          'real_estate',
    label:       'العقارات',
    description: 'إدارة العقارات، الإيجارات، والمبيعات',
    location:    'سوريا 🇸🇾',
    icon:        '🏢',
    route:       '/real-estate',
    built:       true,
  },
  {
    id:          'honey',
    label:       'تجارة العسل',
    description: 'تحليلات المنحل — الخلايا، التكاليف، الحصاد',
    location:    'سوريا 🇸🇾',
    icon:        '🍯',
    route:       '/honey',
    built:       true,
  },
  {
    id:          'butcher',
    label:       'الجزارة',
    description: 'إدارة متجر اللحوم والمبيعات',
    location:    'كندا 🇨🇦',
    icon:        '🥩',
    route:       '/butcher',
    built:       false,
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { profile, modules, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-5">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={signOut}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut size={17} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">عائلة ايهاب عبد الفتاح</h1>
            <p className="text-xs text-gray-400 mt-0.5">إدارة الأعمال العائلية</p>
          </div>
          {/* spacer to keep title centred */}
          <div className="w-8" />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 max-w-lg mx-auto pt-6">

        {/* Greeting */}
        {profile && (
          <p className="text-gray-500 text-sm pb-1">
            مرحباً،{' '}
            <span className="font-semibold text-gray-800">{profile.name}</span>
          </p>
        )}

        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pb-1">
          الأعمال
        </h2>

        {BUSINESSES.map(biz => {
          const hasPermission = modules.includes(biz.id)
          const isClickable   = hasPermission && biz.built

          return (
            <div
              key={biz.id}
              onClick={() => isClickable && navigate(biz.route)}
              className={`bg-white rounded-2xl border p-4 transition-all flex items-center gap-4 ${
                isClickable
                  ? 'border-gray-100 shadow-sm cursor-pointer active:scale-[0.99] hover:border-amber-300 hover:shadow-md'
                  : 'border-gray-100 shadow-sm opacity-50 cursor-default'
              }`}
            >
              {/* Icon */}
              <div className="text-4xl leading-none shrink-0">{biz.icon}</div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 text-base">{biz.label}</h3>

                  {/* Badges */}
                  {!biz.built && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      قريباً
                    </span>
                  )}
                  {biz.built && !hasPermission && (
                    <span className="flex items-center gap-1 text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full">
                      <Lock size={10} />
                      محظور
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{biz.description}</p>
                <p className="text-xs text-gray-300 mt-1">{biz.location}</p>
              </div>

              {/* Arrow — only shown when tappable */}
              {isClickable && (
                <ChevronLeft size={20} className="text-gray-300 shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
