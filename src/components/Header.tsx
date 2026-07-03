'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

const navItemClass =
  'px-2.5 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors whitespace-nowrap'

const navItemActiveClass = 'text-white bg-slate-800/70'

function NavDivider() {
  return <span className="hidden lg:block w-px h-5 bg-slate-700/80 mx-1 shrink-0" aria-hidden />
}

export default function Header({ backButton = false, backHref = '/', title }: HeaderProps) {
  const [hasActiveTournament, setHasActiveTournament] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { language } = useLanguage()
  const isEnglish = language === 'en'
  const pathname = usePathname()

  const defaultTitle = isEnglish ? 'Pro Clubs Tournaments' : 'Pro Clubs Turneringer'
  const showSubtitle = Boolean(title && title !== defaultTitle)

  useEffect(() => {
    const checkActiveTournament = async () => {
      try {
        const tournaments = await fetchTournaments()
        setHasActiveTournament(tournaments.some(t => t.status === 'ongoing'))
      } catch (error) {
        console.error('Error checking active tournament:', error)
      }
    }
    checkActiveTournament()
  }, [])

  const closeMenu = () => setIsMobileMenuOpen(false)

  const linkClass = (href: string) =>
    `${navItemClass}${pathname === href || pathname.startsWith(`${href}/`) ? ` ${navItemActiveClass}` : ''}`

  const primaryNav = (
    <>
      <Link href="/tournaments" className={linkClass('/tournaments')} onClick={closeMenu}>
        {isEnglish ? 'Tournaments' : 'Turneringer'}
      </Link>
      {hasActiveTournament ? (
        <span
          className="px-2.5 py-1 text-xs text-amber-200/90 bg-amber-950/40 border border-amber-700/30 rounded-md whitespace-nowrap"
          title={isEnglish ? 'Registration closed while a tournament is live' : 'Påmelding stengt under pågående turnering'}
        >
          {isEnglish ? 'Reg. closed' : 'Påmelding stengt'}
        </span>
      ) : (
        <Link href="/register" className={`${linkClass('/register')} font-medium text-blue-300 hover:text-blue-200`} onClick={closeMenu}>
          {isEnglish ? 'Register' : 'Påmelding'}
        </Link>
      )}
      <Link href="/hall-of-fame" className={linkClass('/hall-of-fame')} onClick={closeMenu}>
        Hall of Fame
      </Link>
      <Link href="/rules" className={linkClass('/rules')} onClick={closeMenu}>
        {isEnglish ? 'Rules' : 'Regler'}
      </Link>
      <Link href="/faq" className={linkClass('/faq')} onClick={closeMenu}>
        FAQ
      </Link>
    </>
  )

  const secondaryNav = (
    <>
      <Link href="/captain/login" className={linkClass('/captain/login')} onClick={closeMenu}>
        {isEnglish ? 'Captain' : 'Lagleder'}
      </Link>
      <a
        href="https://discord.gg/Es8UAkax8H"
        target="_blank"
        rel="noopener noreferrer"
        className={`${navItemClass} inline-flex items-center gap-1`}
        onClick={closeMenu}
      >
        Discord
        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
      </a>
    </>
  )

  const mobileNav = (
    <>
      {primaryNav}
      <NavDivider />
      {secondaryNav}
      <NavDivider />
      <div className="py-1">
        <LanguageToggle />
      </div>
    </>
  )

  return (
    <header className="pro11-card mx-4 mt-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 min-h-[4.5rem] lg:min-h-[3.75rem]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          {backButton && (
            <Link
              href={backHref}
              className="hidden lg:inline-flex pro11-button-secondary items-center gap-1.5 px-2.5 py-1.5 text-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isEnglish ? 'Back' : 'Tilbake'}</span>
            </Link>
          )}
          <Logo className="w-16 sm:w-20 lg:w-[4.5rem] h-auto shrink-0" />
          {showSubtitle && (
            <div className="hidden md:block min-w-0 border-l border-slate-700/60 pl-3">
              <p className="text-slate-400 text-sm truncate">{title}</p>
            </div>
          )}
        </div>

        <nav className="hidden lg:flex items-center gap-0.5 shrink-0" aria-label={isEnglish ? 'Main navigation' : 'Hovedmeny'}>
          {primaryNav}
          <NavDivider />
          {secondaryNav}
          <NavDivider />
          <LanguageToggle />
        </nav>

        <div className="flex items-center gap-2 lg:hidden pr-1">
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="pro11-button-secondary text-sm px-3 py-1.5"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? (isEnglish ? 'Close menu' : 'Lukk meny') : (isEnglish ? 'Open menu' : 'Åpne meny')}
          >
            {isMobileMenuOpen ? (isEnglish ? 'Close' : 'Lukk') : (isEnglish ? 'Menu' : 'Meny')}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-700/50 px-4 py-3 flex flex-col gap-1">
          {backButton && (
            <Link
              href={backHref}
              className={`${navItemClass} flex items-center gap-2`}
              onClick={closeMenu}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isEnglish ? 'Back' : 'Tilbake'}</span>
            </Link>
          )}
          {mobileNav}
        </div>
      )}
    </header>
  )
}
