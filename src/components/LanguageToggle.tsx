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
       >
         NO
       </button>
       <button
         type="button"
         onClick={() => setLanguage('en')}
         className={`px-2 py-1 rounded-full transition-colors ${isEnglish ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
         aria-pressed={isEnglish}
       >
         EN
       </button>
     </div>
   )
 }
