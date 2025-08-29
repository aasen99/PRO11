'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Menu, X, ArrowLeft } from 'lucide-react'

interface HeaderProps {
  backButton?: boolean
  backHref?: string
}

export default function Header({ backButton = false, backHref = "/" }: HeaderProps) {
  // Responsive header with mobile menu
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <header className="pro11-card mx-4 mt-4 h-24 relative">
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo and Title */}
        <div className="flex items-center">
          <Link href="/" className="w-24 h-full flex items-center justify-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
          </Link>
          <div className="ml-4">
            <p className="text-slate-400 text-sm">Pro Clubs Turneringer</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6 items-center">
          {!backButton ? (
            <>
              <Link href="/tournaments" className="text-slate-300 hover:text-white transition-colors">
                Turneringer
              </Link>
              <Link href="/register" className="text-slate-300 hover:text-white transition-colors">
                Påmelding
              </Link>
              <Link href="/hall-of-fame" className="text-slate-300 hover:text-white transition-colors">
                Hall of Fame
              </Link>
              <a 
                href="https://discord.gg/Es8UAkax8H" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <span>Discord</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          ) : (
            <Link href={backHref} className="pro11-button-secondary flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Tilbake</span>
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#121826] border-t border-slate-700 z-50">
          <nav className="flex flex-col space-y-0">
            {!backButton ? (
              <>
                <Link 
                  href="/tournaments" 
                  className="px-6 py-4 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-700"
                  onClick={closeMenu}
                >
                  Turneringer
                </Link>
                <Link 
                  href="/register" 
                  className="px-6 py-4 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-700"
                  onClick={closeMenu}
                >
                  Påmelding
                </Link>
                <Link 
                  href="/hall-of-fame" 
                  className="px-6 py-4 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-700"
                  onClick={closeMenu}
                >
                  Hall of Fame
                </Link>
                <a 
                  href="https://discord.gg/Es8UAkax8H" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-6 py-4 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center space-x-2"
                  onClick={closeMenu}
                >
                  <span>Discord</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </>
            ) : (
              <Link 
                href={backHref} 
                className="px-6 py-4 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center space-x-2"
                onClick={closeMenu}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Tilbake</span>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
} 