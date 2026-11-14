import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import hi from './locales/hi.json'
import mr from './locales/mr.json'
import bn from './locales/bn.json'
import te from './locales/te.json'
import ta from './locales/ta.json'
import gu from './locales/gu.json'
import kn from './locales/kn.json'
import ur from './locales/ur.json'

export const LANGUAGE_STORAGE_KEY = 'jalgyan.language'
export const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'mr', name: 'मराठी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'gu', name: 'ગુજરાતી' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ur', name: 'اردو' },
]

const supported = new Set(languages.map(({ code }) => code))
const storedLanguage = typeof window !== 'undefined' ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null
const initialLanguage = supported.has(storedLanguage) ? storedLanguage : 'en'

function setDocumentLanguage(language) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en }, hi: { translation: hi }, mr: { translation: mr },
    bn: { translation: bn }, te: { translation: te }, ta: { translation: ta },
    gu: { translation: gu }, kn: { translation: kn }, ur: { translation: ur },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: [...supported],
  interpolation: { escapeValue: false },
  returnNull: false,
})

setDocumentLanguage(initialLanguage)
i18n.on('languageChanged', (language) => {
  setDocumentLanguage(supported.has(language) ? language : 'en')
  if (typeof window !== 'undefined') window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
})

export default i18n
