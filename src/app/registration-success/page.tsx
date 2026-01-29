'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, CheckCircle, Copy, AlertTriangle, ArrowRight } from 'lucide-react'
import Header from '../../components/Header'
import { useLanguage } from '@/components/LanguageProvider'

interface RegistrationData {
  teamName: string
  captainName: string
  captainEmail: string
  teamId: string
  password: string
  tournamentId?: string
  entryFee?: number
}

export default function RegistrationSuccessPage() {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null)
  const [copied, setCopied] = useState(false)
  const { language } = useLanguage()
  const isEnglish = language === 'en'

  useEffect(() => {
    // Hent registreringsdata fra localStorage
    const stored = localStorage.getItem('teamRegistration')
    if (stored) {
      const data = JSON.parse(stored)
      setRegistrationData(data)
    } else {
      // Hvis ingen data, redirect til registrering
      window.location.href = '/register'
    }
  }, [])

  const copyPassword = () => {
    if (registrationData?.password) {
      navigator.clipboard.writeText(registrationData.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleContinue = () => {
    // Redirect til betalingssiden
    window.location.href = '/payment'
  }

  if (!registrationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header backButton={true} backHref="/" />

      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="max-w-2xl w-full">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600/20 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <h1 className="text-4xl font-bold mb-2">
              {isEnglish ? 'Registration completed!' : 'Registrering fullført!'}
            </h1>
            <p className="text-slate-300 text-lg">
              {isEnglish
                ? `${registrationData.teamName} is now registered`
                : `${registrationData.teamName} er nå registrert`}
            </p>
          </div>

          {/* Important Password Section */}
          <div className="pro11-card p-8 mb-6">
            <div className="flex items-start space-x-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold mb-2 text-yellow-400">
                  {isEnglish ? 'IMPORTANT: Save your password!' : 'VIKTIG: Noter ned passordet!'}
                </h2>
                <p className="text-slate-300 mb-4">
                  {isEnglish
                    ? 'You need this password to log in as team captain and manage your team.'
                    : 'Dette passordet trenger du for å logge inn som lagkaptein og administrere laget ditt.'}
                  <strong className="text-white">
                    {isEnglish ? ' You will not be able to see this password again.' : ' Du vil ikke kunne se dette passordet igjen.'}
                  </strong>
                </p>
              </div>
            </div>

            {/* Password Display */}
            <div className="bg-slate-900/50 border-2 border-yellow-500/50 rounded-lg p-6 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-400">{isEnglish ? 'Your password:' : 'Ditt passord:'}</label>
                <button
                  onClick={copyPassword}
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">{copied ? (isEnglish ? 'Copied!' : 'Kopiert!') : (isEnglish ? 'Copy' : 'Kopier')}</span>
                </button>
              </div>
              <div className="bg-slate-800 p-4 rounded border border-slate-700">
                <p className="text-2xl font-mono text-center text-green-400 font-bold tracking-wider">
                  {registrationData.password}
                </p>
              </div>
            </div>

            {/* Login Info */}
            <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-slate-300 mb-2">
                <strong>{isEnglish ? 'Login email:' : 'E-post for innlogging:'}</strong> {registrationData.captainEmail}
              </p>
              <p className="text-sm text-slate-400">
                {isEnglish ? 'You can log in at' : 'Du kan logge inn på'}{' '}
                <Link href="/captain/login" className="text-blue-400 hover:underline">
                  /captain/login
                </Link>
                {' '}{isEnglish ? 'using the email address and password above.' : 'med e-postadressen og passordet over.'}
              </p>
            </div>
          </div>

          {/* Team Info Card */}
          <div className="pro11-card p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{isEnglish ? 'Team information' : 'Laginformasjon'}</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">{isEnglish ? 'Team name:' : 'Lagnavn:'}</span>
                <span className="font-semibold">{registrationData.teamName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isEnglish ? 'Captain:' : 'Kaptein:'}</span>
                <span className="font-semibold">{registrationData.captainName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isEnglish ? 'Email:' : 'E-post:'}</span>
                <span className="font-semibold">{registrationData.captainEmail}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="pro11-button w-full text-lg py-4 flex items-center justify-center space-x-2"
            >
              <span>
                {registrationData.entryFee === 0
                  ? (isEnglish ? 'Complete free registration' : 'Fullfør gratis påmelding')
                  : (isEnglish ? 'Continue to payment' : 'Fortsett til betaling')}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <Link 
                href="/" 
                className="text-slate-400 hover:text-slate-300 transition-colors text-sm"
              >
                {isEnglish ? 'Or go back to the homepage' : 'Eller gå tilbake til forsiden'}
              </Link>
            </div>
          </div>

          {/* Warning Footer */}
          <div className="mt-8 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-300 text-center">
            ⚠️ <strong>{isEnglish ? 'Remember:' : 'Husk:'}</strong>{' '}
            {isEnglish
              ? 'If you do not save the password now, you will not be able to log in later. Contact support if you forget it.'
              : 'Hvis du ikke noterer ned passordet nå, vil du ikke kunne logge inn senere. Kontakt support hvis du glemmer passordet.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

