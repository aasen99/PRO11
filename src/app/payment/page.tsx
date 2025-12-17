'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, CreditCard, CheckCircle, ArrowLeft, Mail } from 'lucide-react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { getTournamentById } from '../../lib/tournaments'

interface PaymentData {
  teamName: string
  captainName: string
  captainEmail: string
  expectedPlayers: number
  tournamentId: string
  teamId?: string
  amount: number
  generatedPassword?: string
}

export default function PaymentPage() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  useEffect(() => {
    // Hent registreringsdata fra localStorage eller URL params
    const registrationData = localStorage.getItem('teamRegistration')
    if (registrationData) {
      const data = JSON.parse(registrationData)
      setPaymentData({
        ...data,
        amount: 299 // Fast pris per lag
      })
      // Sett paymentId hvis det finnes
      if (data.teamId) {
        setPaymentId(data.teamId)
      }
    }
  }, [])


  const handlePaymentSuccess = async (details: any) => {
    setIsProcessing(true)
    
    try {
      // Opprett betalingspost i database først
      let paymentRecordId = null
      if (paymentData && paymentData.teamId) {
        const createResponse = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teamId: paymentData.teamId,
            amount: paymentData.amount,
            currency: 'NOK'
          })
        })
        
        if (createResponse.ok) {
          const paymentData_result = await createResponse.json()
          paymentRecordId = paymentData_result.paymentId
        }
      }
      
      // Oppdater betaling i database
      if (paymentRecordId) {
        const response = await fetch('/api/payments', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId: paymentRecordId,
            status: 'completed',
            paypalOrderId: details.id || details.orderID
          })
        })
        
        if (!response.ok) {
          console.warn('Payment update failed, but continuing...')
        }
      }
      
      console.log('Payment successful:', details)
      setPaymentComplete(true)
      
      // Oppdater team-status i localStorage for adminpanelet
      if (paymentData) {
        const storedTeams = localStorage.getItem('adminTeams')
        if (storedTeams) {
          const teams = JSON.parse(storedTeams)
          const updatedTeams = teams.map((team: any) => 
            team.id === paymentData.teamId 
              ? { ...team, paymentStatus: 'completed', payment_status: 'completed', status: 'approved' }
              : team
          )
          localStorage.setItem('adminTeams', JSON.stringify(updatedTeams))
          console.log('Updated team payment status in localStorage')
        }
      }
      
      // Ikke fjern registreringsdata - brukeren kan trenge passordet
      
    } catch (error) {
      console.error('Payment error:', error)
      alert('Betalingen feilet. Prøv igjen.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentError = (error: any) => {
    console.error('PayPal error:', error)
    alert('Betalingen feilet. Prøv igjen.')
    setIsProcessing(false)
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
              <p className="text-slate-300 mb-4">
                Din betaling er bekreftet og laget ditt er nå godkjent for turneringen.
              </p>
              <p className="text-slate-400 text-sm">
                Du kan logge inn som lagkaptein med passordet du noterte ned under registreringen.
              </p>
            </div>
            <div className="space-y-3">
              <Link href="/" className="pro11-button w-full">
                Tilbake til forsiden
              </Link>
              <Link href="/captain/login" className="pro11-button-secondary w-full">
                Logg inn som lagkaptein
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

          {/* PayPal Payment */}
          <div className="pro11-card p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">Betaling med PayPal</h2>
            <p className="text-slate-300 mb-6 text-center">
              Trygg og sikker betaling med PayPal
            </p>
            
            <div className="text-center">
              {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
                <PayPalScriptProvider 
                  options={{ 
                    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
                    currency: 'NOK',
                    intent: 'capture'
                  }}
                >
                  <PayPalButtons
                    createOrder={(data, actions) => {
                      return actions.order.create({
                        intent: 'CAPTURE',
                        purchase_units: [{
                          amount: {
                            value: paymentData.amount.toString(),
                            currency_code: 'NOK'
                          },
                          description: `PRO11 Turnering - ${paymentData.teamName}`
                        }]
                      })
                    }}
                    onApprove={(data, actions) => {
                      return actions.order!.capture().then((details) => {
                        handlePaymentSuccess(details)
                      })
                    }}
                    onError={handlePaymentError}
                    style={{
                      layout: 'vertical',
                      color: 'blue',
                      shape: 'rect',
                      label: 'paypal'
                    }}
                  />
                </PayPalScriptProvider>
              ) : (
                <div className="p-8 bg-slate-800/50 rounded-lg">
                  <p className="text-slate-400 mb-4">
                    PayPal er ikke konfigurert ennå. Kontakt administrator.
                  </p>
                  <button
                    onClick={() => {
                      // Fallback til simuler betaling for testing
                      handlePaymentSuccess({ orderID: 'test-' + Date.now() })
                    }}
                    className="pro11-button text-lg px-8 py-4"
                  >
                    Test betaling (simulert)
                  </button>
                  <p className="text-slate-500 text-sm mt-2">
                    Dette simulerer en fullført betaling for testing
                  </p>
                </div>
              )}
              
              <p className="text-slate-400 text-sm mt-4">
                Etter fullført betaling vil laget ditt bli godkjent for turneringen
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 