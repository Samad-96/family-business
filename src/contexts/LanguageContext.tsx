import { createContext, useContext, useState } from 'react'

type Lang = 'en' | 'ar'

interface LangCtx {
  lang: Lang
  toggle: () => void
  t: (en: string, ar: string) => string
  isAr: boolean
}

const LanguageContext = createContext<LangCtx>({
  lang: 'ar', toggle: () => {}, t: (_, ar) => ar, isAr: true,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem('honey_lang') as Lang) ?? 'ar'
  )

  function toggle() {
    setLang(prev => {
      const next = prev === 'ar' ? 'en' : 'ar'
      localStorage.setItem('honey_lang', next)
      return next
    })
  }

  return (
    <LanguageContext.Provider value={{
      lang,
      toggle,
      t: (en, ar) => lang === 'ar' ? ar : en,
      isAr: lang === 'ar',
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
