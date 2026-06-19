'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { fetchTournaments } from '../lib/tournaments'
import LanguageToggle from './LanguageToggle'
import { useLanguage } from './LanguageProvider'
import Logo from './Logo'

interface HeaderProps {
  backButton?: boolean
  backHref?: string
  title?: string
}

export default function Header({ backButton = false, backHref = '/', title }: HeaderProps) {
  const [hasActiveTournament, setHasActiveTournament] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { language } = useLanguage()
  const isEnglish = language === 'en'

  useEffect(() => {
    const checkActiveTournament = async () => {
      try {
        const tournaments = await fetchTournaments()
        const hasActive = tournaments.some(t => t.status === 'ongoing')
        setHasActiveTournament(hasActive)
      } catch (error) {
        console.error('Error checking active tournament:', error)
      }
    }
    checkActiveTournament()
  }, [])

  const closeMenu = () => setIsMobileMenuOpen(false)

  const navLinks = (
    <>
      <Link href="/tournaments" className="text-slate-300 hover:text-white transition-colors whitespace-nowrap" onClick={closeMenu}>
        {isEnglish ? 'Tournaments' : 'Turneringer'}
      </Link>
      {hasActiveTournament ? (
        <span className="text-slate-500 cursor-not-allowed whitespace-nowrap" title={isEnglish ? 'Registration closed' : 'Påmelding stengt'}>
          {isEnglish ? 'Closed' : 'Stengt'}
        </span>
      ) : (
        <Link href="/register" className="text-slate-300 hover:text-white transition-colors whitespace-nowrap" onClick={closeMenu}>
          {isEnglish ? 'Registration' : 'Påmelding'}
        </Link>
      )}
      <Link href="/add-team" className="text-slate-300 hover:text-white transition-colors whitespace-nowrap" onClick={closeMenu}>
        {isEnglish ? 'Add team' : 'Legg til lag'}
      </Link>
      <Link href="/hall-of-fame" className="text-slate-300 hover:text-white transition-colors whitespace-nowrap" onClick={closeMenu}>
        Hall of Fame
      </Link>
      <Link href="/captain/login" className="text-slate-300 hover:text-white transition-colors whitespace-nowrap" onClick={closeMenu}>
        {isEnglish ? 'Captain' : 'Lagleder'}
      </Link>
      <a
        href="https://discord.gg/Es8UAkax8H"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1 whitespace-nowrap"
        onClick={closeMenu}
      >
        <span>Discord</span>
        <ExternalLink className="w-4 h-4" />
      </a>
      <LanguageToggle />
    </>
  )

  return (
    <header className="pro11-card mx-4 mt-4 h-24">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center">
          <Logo className="w-24 h-full" />
          <div className="ml-4">
            <p className="text-slate-400 text-sm">
              {title || (isEnglish ? 'Pro Clubs Tournaments' : 'Pro Clubs Turneringer')}
            </p>
          </div>
        </div>

        <nav className="hidden lg:flex flex-1 items-center justify-end gap-6 px-4 text-xs whitespace-nowrap">
          {navLinks}
          {backButton && (
            <Link href={backHref} className="pro11-button-secondary flex items-center gap-2 whitespace-nowrap ml-2">
              <ArrowLeft className="w-4 h-4" />
              <span>{isEnglish ? 'Back' : 'Tilbake'}</span>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 pr-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="pro11-button-secondary text-sm"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? (isEnglish ? 'Close menu' : 'Lukk meny') : (isEnglish ? 'Open menu' : 'Åpne meny')}
          >
            {isMobileMenuOpen ? (isEnglish ? 'Close' : 'Lukk') : (isEnglish ? 'Menu' : 'Meny')}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-24 px-4 pb-4 z-50">
          <div className="pro11-card p-4 flex flex-col gap-3">
            {backButton && (
              <Link
                href={backHref}
                className="text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                onClick={closeMenu}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isEnglish ? 'Back' : 'Tilbake'}</span>
              </Link>
            )}
            {navLinks}
          </div>
        </div>
      )}
    </header>
  )
}
