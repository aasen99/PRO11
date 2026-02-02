 'use client'
 
 import React from 'react'
import Link from 'next/link'
import { useLanguage } from './LanguageProvider'
import LanguageToggle from './LanguageToggle'
 
 export default function Footer() {
   const { language } = useLanguage()
   const isEnglish = language === 'en'
 
   return (
     <footer className="py-8 text-center text-xs text-slate-500">
       <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
        <Link href="/faq" className="text-white hover:text-slate-200 transition-colors">FAQ</Link>
        <Link href="/rules" className="text-white hover:text-slate-200 transition-colors">
           {isEnglish ? 'Rules' : 'Regler'}
         </Link>
        <Link href="/kjopsvilkar" className="text-white hover:text-slate-200 transition-colors">
           {isEnglish ? 'Terms of Purchase' : 'Kjøpsvilkår'}
         </Link>
        <Link href="/personvern" className="text-white hover:text-slate-200 transition-colors">
           {isEnglish ? 'Privacy' : 'Personvern'}
         </Link>
        <LanguageToggle />
       </div>
       <p>{isEnglish ? '© 2026 PRO11. Part of E-spårt AS.' : '© 2026 PRO11. En del av E-spårt AS.'}</p>
       <p>
         {isEnglish
           ? 'PRO11 is an independent tournament organizer and is not affiliated with Electronic Arts Inc.'
           : 'PRO11 er en uavhengig turneringsarrangør og har ingen tilknytning til Electronic Arts Inc.'}
       </p>
     </footer>
   )
 }
