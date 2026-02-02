 'use client'
 
 import React from 'react'
 import { useLanguage } from './LanguageProvider'
 
 export default function LanguageToggle() {
   const { language, setLanguage } = useLanguage()
   const isEnglish = language === 'en'
 
   return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLanguage('no')}
        className={`p-0 leading-none bg-transparent border-0 shadow-none appearance-none transition-opacity focus-visible:outline-none ${!isEnglish ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
        aria-pressed={!isEnglish}
        aria-label="Norsk"
        title="Norsk"
      >
        <img src="/flags/no.svg" alt="" className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`p-0 leading-none bg-transparent border-0 shadow-none appearance-none transition-opacity focus-visible:outline-none ${isEnglish ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
        aria-pressed={isEnglish}
        aria-label="English"
        title="English"
      >
        <img src="/flags/gb.svg" alt="" className="w-5 h-5" />
      </button>
     </div>
   )
 }
