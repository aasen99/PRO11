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
        className={`p-0 leading-none rounded-sm bg-transparent border-0 transition-opacity focus-visible:outline-none ${!isEnglish ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
        aria-pressed={!isEnglish}
        aria-label="Norsk"
        title="Norsk"
      >
        <svg
          className="w-5 h-5"
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
        className={`p-0 leading-none rounded-sm bg-transparent border-0 transition-opacity focus-visible:outline-none ${isEnglish ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
        aria-pressed={isEnglish}
        aria-label="English"
        title="English"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 60 30"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="60" height="30" fill="#012169" />
          <polygon points="0,0 7,0 60,23 60,30 53,30 0,7" fill="#FFFFFF" />
          <polygon points="60,0 53,0 0,23 0,30 7,30 60,7" fill="#FFFFFF" />
          <polygon points="0,0 3.5,0 60,26.5 60,30 56.5,30 0,3.5" fill="#C8102E" />
          <polygon points="60,0 56.5,0 0,26.5 0,30 3.5,30 60,3.5" fill="#C8102E" />
          <rect x="24" width="12" height="30" fill="#FFFFFF" />
          <rect y="9" width="60" height="12" fill="#FFFFFF" />
          <rect x="26" width="8" height="30" fill="#C8102E" />
          <rect y="11" width="60" height="8" fill="#C8102E" />
        </svg>
      </button>
     </div>
   )
 }
