'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { fetchTournaments } from '../lib/tournaments'
import LanguageToggle from './LanguageToggle'
import { useLanguage } from './LanguageProvider'

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

  return (
    <header className="pro11-card mx-4 mt-4 h-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="w-24 h-full flex items-center justify-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
          </Link>
          <div className="ml-4">
            <p className="text-slate-400 text-sm">
              {title || (isEnglish ? 'Pro Clubs Tournaments' : 'Pro Clubs Turneringer')}
            </p>
          </div>
        </div>
        <nav className="hidden md:flex items-center space-x-6 p-6">
          <Link href="/tournaments" className="text-slate-300 hover:text-white transition-colors">
            {isEnglish ? 'Tournaments' : 'Turneringer'}
          </Link>
          {hasActiveTournament ? (
            <span className="text-slate-500 cursor-not-allowed">
              {isEnglish ? 'Registration closed' : 'Påmelding stengt'}
            </span>
          ) : (
            <Link href="/register" className="text-slate-300 hover:text-white transition-colors">
              {isEnglish ? 'Registration' : 'Påmelding'}
            </Link>
          )}
          <Link href="/add-team" className="text-slate-300 hover:text-white transition-colors">
            {isEnglish ? 'Add team' : 'Legg til lag'}
          </Link>
          <Link href="/hall-of-fame" className="text-slate-300 hover:text-white transition-colors">
            Hall of Fame
          </Link>
          <a href="https://discord.gg/Es8UAkax8H" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors flex items-center space-x-1">
            <span>Discord</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <LanguageToggle />
        </nav>
        <div className="flex items-center gap-2 pr-4 md:pr-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="pro11-button-secondary text-sm md:hidden"
          >
            {isMobileMenuOpen ? (isEnglish ? 'Close' : 'Lukk') : (isEnglish ? 'Menu' : 'Meny')}
          </button>
          {backButton && (
            <Link href={backHref} className="pro11-button-secondary flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>{isEnglish ? 'Back' : 'Tilbake'}</span>
            </Link>
          )}
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-24 px-4 pb-4 md:hidden z-50">
          <div className="pro11-card p-4 flex flex-col space-y-3">
            <Link
              href="/tournaments"
              className="text-slate-300 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {isEnglish ? 'Tournaments' : 'Turneringer'}
            </Link>
            {hasActiveTournament ? (
              <span className="text-slate-500 cursor-not-allowed">
                {isEnglish ? 'Registration closed' : 'Påmelding stengt'}
              </span>
            ) : (
              <Link
                href="/register"
                className="text-slate-300 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {isEnglish ? 'Registration' : 'Påmelding'}
              </Link>
            )}
            <Link
              href="/add-team"
              className="text-slate-300 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {isEnglish ? 'Add team' : 'Legg til lag'}
            </Link>
            <Link
              href="/hall-of-fame"
              className="text-slate-300 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Hall of Fame
            </Link>
            <a
              href="https://discord.gg/Es8UAkax8H"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors flex items-center space-x-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>Discord</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <LanguageToggle />
          </div>
        </div>
      )}
    </header>
  )
}