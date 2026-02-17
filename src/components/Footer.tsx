 'use client'
 
 import React from 'react'
import Link from 'next/link'
import { useLanguage } from './LanguageProvider'
import LanguageToggle from './LanguageToggle'
 
 export default function Footer() {
   const { language } = useLanguage()
   const isEnglish = language === 'en'
 
  return (
    <footer className="py-6 sm:py-8 px-4 text-center text-xs text-slate-500">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-4 mb-3">
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
        <p className="px-1">{isEnglish ? '© 2026 PRO11. Part of E-spårt AS.' : '© 2026 PRO11. En del av E-spårt AS.'}</p>
        <p className="mt-1 px-1 leading-relaxed">
          {isEnglish
            ? 'PRO11 is an independent tournament organizer and is not affiliated with Electronic Arts Inc.'
            : 'PRO11 er en uavhengig turneringsarrangør og har ingen tilknytning til Electronic Arts Inc.'}
        </p>
      </div>
    </footer>
  )
 }
