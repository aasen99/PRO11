 'use client'
 
 import React from 'react'
 import { useLanguage } from './LanguageProvider'
 
 export default function LanguageToggle() {
   const { language, setLanguage } = useLanguage()
   const isEnglish = language === 'en'
 
   return (
     <div className="flex items-center gap-1 rounded-full bg-slate-800/80 p-1 text-xs">
      <button
        type="button"
        onClick={() => setLanguage('no')}
        className={`px-2 py-1 rounded-full transition-colors ${!isEnglish ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
        aria-pressed={!isEnglish}
        aria-label="Norsk"
        title="Norsk"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 22 16"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="22" height="16" fill="#EF2B2D" />
          <rect x="6" width="4" height="16" fill="#FFFFFF" />
          <rect y="6" width="22" height="4" fill="#FFFFFF" />
          <rect x="7" width="2" height="16" fill="#002868" />
          <rect y="7" width="22" height="2" fill="#002868" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded-full transition-colors ${isEnglish ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
        aria-pressed={isEnglish}
        aria-label="English"
        title="English"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 22 16"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="22" height="16" fill="#012169" />
          <polygon points="0,0 2.5,0 22,12.5 22,16 19.5,16 0,3.5" fill="#FFFFFF" />
          <polygon points="22,0 19.5,0 0,12.5 0,16 2.5,16 22,3.5" fill="#FFFFFF" />
          <polygon points="0,0 1.6,0 22,11.4 22,16 20.4,16 0,4.6" fill="#C8102E" />
          <polygon points="22,0 20.4,0 0,11.4 0,16 1.6,16 22,4.6" fill="#C8102E" />
          <rect x="9" width="4" height="16" fill="#FFFFFF" />
          <rect y="6" width="22" height="4" fill="#FFFFFF" />
          <rect x="10" width="2" height="16" fill="#C8102E" />
          <rect y="7" width="22" height="2" fill="#C8102E" />
        </svg>
      </button>
     </div>
   )
 }
