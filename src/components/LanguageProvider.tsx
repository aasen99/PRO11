 'use client'
 
 import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
 
 export type Language = 'no' | 'en'
 
 interface LanguageContextValue {
   language: Language
   setLanguage: (language: Language) => void
 }
 
 const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)
 
 export function LanguageProvider({ children }: { children: React.ReactNode }) {
   const [language, setLanguageState] = useState<Language>('no')
 
   useEffect(() => {
     const stored = localStorage.getItem('language')
     if (stored === 'no' || stored === 'en') {
       setLanguageState(stored)
     }
   }, [])
 
   useEffect(() => {
     localStorage.setItem('language', language)
     document.documentElement.lang = language
   }, [language])
 
   const setLanguage = (nextLanguage: Language) => {
     setLanguageState(nextLanguage)
   }
 
   const value = useMemo(
     () => ({ language, setLanguage }),
     [language]
   )
 
   return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
 }
 
 export function useLanguage() {
   const context = useContext(LanguageContext)
   if (!context) {
     throw new Error('useLanguage must be used within LanguageProvider')
   }
   return context
 }
