'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, CreditCard, CheckCircle, ArrowLeft, Mail } from 'lucide-react'

interface PaymentData {
  teamName: string
  captainName: string
  captainEmail: string
  expectedPlayers: number
  tournamentId: string
  amount: number
  generatedPassword?: string
}

export default function PaymentPage() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)

  useEffect(() => {
    // Hent registreringsdata fra localStorage eller URL params
    const registrationData = localStorage.getItem('teamRegistration')
    if (registrationData) {
      const data = JSON.parse(registrationData)
      setPaymentData({
        ...data,
        amount: 299 // Fast pris per lag
      })
    }
  }, [])

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handlePayment = async () => {
    setIsProcessing(true)
    
    // Generer passord
    const password = generatePassword()
    
    // Simuler betalingsprosess
    setTimeout(() => {
      setIsProcessing(false)
      setPaymentComplete(true)
      
      // Oppdater paymentData med passord
      if (paymentData) {
        setPaymentData({ ...paymentData, generatedPassword: password })
        
        // Lagre passordet for login
        const storedPasswords = localStorage.getItem('generatedPasswords') || '{}'
        const passwords = JSON.parse(storedPasswords)
        passwords[paymentData.captainEmail] = password
        localStorage.setItem('generatedPasswords', JSON.stringify(passwords))
      }
      
      // Fjern registreringsdata fra localStorage
      localStorage.removeItem('teamRegistration')
    }, 3000)
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen">
        <header className="pro11-card mx-4 mt-4 h-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="w-24 h-full flex items-center justify-center hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
              </Link>
              <div className="ml-4">
                <p className="text-slate-400 text-sm">Pro Clubs Turneringer</p>
              </div>
            </div>
            <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Tilbake</span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 flex flex-col items-center">
          <div className="pro11-card p-8 max-w-2xl w-full text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Ingen registrering funnet</h1>
            <p className="text-slate-300 mb-6">
              Det ser ut som du ikke har registrert et lag ennå.
            </p>
            <Link href="/register" className="pro11-button">
              Registrer lag
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen">
        <header className="pro11-card mx-4 mt-4 h-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="w-24 h-full flex items-center justify-center hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
              </Link>
              <div className="ml-4">
                <p className="text-slate-400 text-sm">Pro Clubs Turneringer</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 flex flex-col items-center">
          <div className="pro11-card p-8 max-w-2xl w-full text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Betaling fullført!</h1>
            <p className="text-slate-300 mb-6">
              Takk for din registrering! {paymentData.teamName} er nå påmeldt til turneringen.
            </p>
            <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Bekreftelse sendt til:</h3>
              <p className="text-blue-400">{paymentData.captainEmail}</p>
              <div className="mt-3 p-3 bg-green-900/30 border border-green-600/30 rounded">
                <h4 className="font-semibold text-green-400 mb-1">Passord generert:</h4>
                <p className="text-lg font-mono text-green-300">{paymentData.generatedPassword}</p>
                <p className="text-sm text-green-400 mt-1">
                  Dette passordet er sendt på e-post og kan brukes til å logge inn som lagkaptein
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Link href="/" className="pro11-button w-full">
                Tilbake til forsiden
              </Link>
              <Link href="/tournaments" className="pro11-button-secondary w-full">
                Se alle turneringer
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="pro11-card mx-4 mt-4 h-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="w-24 h-full flex items-center justify-center hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="PRO11 Logo" className="w-full h-full object-contain" />
            </Link>
            <div className="ml-4">
              <p className="text-slate-400 text-sm">Pro Clubs Turneringer</p>
            </div>
          </div>
          <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Tilbake</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <div className="max-w-4xl w-full">
          {/* Payment Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Betalingsinformasjon</h1>
            <p className="text-xl text-slate-300">
              Fullfør registreringen av {paymentData.teamName}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Team Information */}
            <div className="pro11-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Laginformasjon</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Lagnavn</label>
                  <p className="text-lg font-semibold">{paymentData.teamName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Kaptein</label>
                  <p className="text-lg font-semibold">{paymentData.captainName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">E-post</label>
                  <p className="text-lg font-semibold">{paymentData.captainEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Antall spillere</label>
                  <p className="text-lg font-semibold">{paymentData.expectedPlayers} spillere</p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="pro11-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Betalingsdetaljer</span>
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Turneringsgebyr</span>
                  <span className="text-2xl font-bold text-green-400">{paymentData.amount} NOK</span>
                </div>
                <div className="text-sm text-slate-400">
                  <p>• Inkluderer deltakelse i turneringen</p>
                  <p>• Alle spillere på laget kan delta</p>
                  <p>• Betalingen er ikke refunderbar</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="pro11-card p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">Betalingsmetoder</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border border-slate-700 rounded-lg text-center hover:border-blue-400 cursor-pointer transition-colors">
                <div className="text-2xl mb-2">💳</div>
                <h3 className="font-semibold">Kort</h3>
                <p className="text-sm text-slate-400">Visa, Mastercard</p>
              </div>
              <div className="p-4 border border-slate-700 rounded-lg text-center hover:border-blue-400 cursor-pointer transition-colors">
                <div className="text-2xl mb-2">🏦</div>
                <h3 className="font-semibold">Vipps</h3>
                <p className="text-sm text-slate-400">Norsk betalingsløsning</p>
              </div>
              <div className="p-4 border border-slate-700 rounded-lg text-center hover:border-blue-400 cursor-pointer transition-colors">
                <div className="text-2xl mb-2">📧</div>
                <h3 className="font-semibold">Faktura</h3>
                <p className="text-sm text-slate-400">Betaling på faktura</p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="pro11-button text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Behandler betaling...</span>
                  </div>
                ) : (
                  `Betal ${paymentData.amount} NOK`
                )}
              </button>
                             <p className="text-slate-400 text-sm mt-4">
                 Du vil få en bekreftelse på e-post etter fullført betaling, inkludert passord for lagkaptein-tilgang
               </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 