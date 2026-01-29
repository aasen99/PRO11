'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, CreditCard, CheckCircle, ArrowLeft, Mail } from 'lucide-react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { getTournamentById } from '../../lib/tournaments'
import { useLanguage } from '@/components/LanguageProvider'

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
  const [tournamentEntryFee, setTournamentEntryFee] = useState<number>(299)
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null)
  const [paypalLoading, setPaypalLoading] = useState(true)
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(true)
  const { language } = useLanguage()
  const isEnglish = language === 'en'

  useEffect(() => {
    // Check PayPal Client ID from API (works even if NEXT_PUBLIC_ var wasn't available at build time)
    const checkPaypalConfig = async () => {
      try {
        const response = await fetch('/api/paypal/config')
        const data = await response.json()
        console.log('PayPal config from API:', data)
        setPaypalClientId(data.clientId)
        setPaypalLoading(false)
      } catch (error) {
        console.error('Error checking PayPal config:', error)
        // Fallback to checking process.env directly
        const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
        console.log('Fallback PayPal check:', {
          hasClientId: !!clientId,
          clientIdLength: clientId?.length || 0
        })
        setPaypalClientId(clientId || null)
        setPaypalLoading(false)
      }
    }
    
    checkPaypalConfig()
  }, [])

  useEffect(() => {
    // Hent registreringsdata fra localStorage eller URL params
    const registrationData = localStorage.getItem('teamRegistration')
    if (registrationData) {
      const data = JSON.parse(registrationData)
      
      // Hent turneringsdata for å få riktig entry fee
      const loadTournament = async () => {
        if (data.tournamentId) {
          try {
            const response = await fetch(`/api/tournaments?id=${data.tournamentId}`)
            if (response.ok) {
              const tournamentData = await response.json()
              if (tournamentData.tournament) {
                const entryFee = tournamentData.tournament.entry_fee ?? 299
                setTournamentEntryFee(entryFee)
                setPaymentData({
                  ...data,
                  amount: entryFee
                })
              } else {
                setPaymentData({
                  ...data,
                  amount: data.entryFee ?? 299 // Fallback
                })
              }
            } else {
              setPaymentData({
                ...data,
                amount: data.entryFee ?? 299 // Fallback
              })
            }
          } catch (error) {
            console.error('Error loading tournament:', error)
            setPaymentData({
              ...data,
              amount: data.entryFee ?? 299 // Fallback
            })
          } finally {
            setIsLoadingRegistration(false)
          }
        } else {
          setPaymentData({
            ...data,
            amount: data.entryFee ?? 299 // Fallback
          })
          setIsLoadingRegistration(false)
        }
      }
      
      loadTournament()
      
      // Sett paymentId hvis det finnes
      if (data.teamId) {
        setPaymentId(data.teamId)
      }
    } else {
      setIsLoadingRegistration(false)
    }
  }, [])


  const updateLocalTeamStatus = () => {
    if (!paymentData) return

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
      updateLocalTeamStatus()
      
      // Ikke fjern registreringsdata - brukeren kan trenge passordet
      
    } catch (error) {
      console.error('Payment error:', error)
      alert(isEnglish ? 'Payment failed. Please try again.' : 'Betalingen feilet. Prøv igjen.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFreeRegistration = async () => {
    if (!paymentData?.teamId) {
      alert(isEnglish ? 'Missing team information for free registration.' : 'Mangler laginformasjon for gratis påmelding.')
      return
    }

    setIsProcessing(true)
    try {
      let paymentRecordId = null
      const createResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: paymentData.teamId,
          amount: paymentData.amount,
          currency: 'NOK',
          paymentMethod: 'free'
        })
      })

      if (createResponse.ok) {
        const paymentData_result = await createResponse.json()
        paymentRecordId = paymentData_result.paymentId
      }

      if (paymentRecordId) {
        await fetch('/api/payments', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId: paymentRecordId,
            status: 'completed'
          })
        })
      } else {
        console.warn('Free registration payment record not created.')
      }

      updateLocalTeamStatus()
      setPaymentComplete(true)
    } catch (error) {
      console.error('Free registration error:', error)
      alert(isEnglish ? 'Could not complete free registration. Please try again.' : 'Kunne ikke fullføre gratis påmelding. Prøv igjen.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentError = (error: any) => {
    console.error('PayPal error:', error)
    alert(isEnglish ? 'Payment failed. Please try again.' : 'Betalingen feilet. Prøv igjen.')
    setIsProcessing(false)
  }

  if (isLoadingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
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
                <p className="text-slate-400 text-sm">
                  {isEnglish ? 'Pro Clubs Tournaments' : 'Pro Clubs Turneringer'}
                </p>
              </div>
            </div>
            <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>{isEnglish ? 'Back' : 'Tilbake'}</span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 flex flex-col items-center">
          <div className="pro11-card p-8 max-w-2xl w-full text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">
              {isEnglish ? 'No registration found' : 'Ingen registrering funnet'}
            </h1>
            <p className="text-slate-300 mb-6">
              {isEnglish
                ? "It looks like you haven't registered a team yet."
                : 'Det ser ut som du ikke har registrert et lag ennå.'}
            </p>
            <Link href="/register" className="pro11-button">
              {isEnglish ? 'Register team' : 'Registrer lag'}
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const isFree = paymentData.amount === 0

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
                <p className="text-slate-400 text-sm">
                  {isEnglish ? 'Pro Clubs Tournaments' : 'Pro Clubs Turneringer'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 flex flex-col items-center">
          <div className="pro11-card p-8 max-w-2xl w-full text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">
              {isEnglish ? 'Payment completed!' : 'Betaling fullført!'}
            </h1>
            <p className="text-slate-300 mb-6">
              {isEnglish
                ? `Thanks for registering! ${paymentData.teamName} is now registered for the tournament.`
                : `Takk for din registrering! ${paymentData.teamName} er nå påmeldt til turneringen.`}
            </p>
            <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
              <p className="text-slate-300 mb-4">
                {isEnglish
                  ? 'Your payment is confirmed and your team is now approved for the tournament.'
                  : 'Din betaling er bekreftet og laget ditt er nå godkjent for turneringen.'}
              </p>
              <p className="text-slate-400 text-sm">
                {isEnglish
                  ? 'You can log in as team captain with the password you noted during registration.'
                  : 'Du kan logge inn som lagkaptein med passordet du noterte ned under registreringen.'}
              </p>
            </div>
            <div className="space-y-3">
              <Link href="/" className="pro11-button w-full">
                {isEnglish ? 'Back to home' : 'Tilbake til forsiden'}
              </Link>
              <Link href="/captain/login" className="pro11-button-secondary w-full">
                {isEnglish ? 'Log in as captain' : 'Logg inn som lagkaptein'}
              </Link>
              <Link href="/tournaments" className="pro11-button-secondary w-full">
                {isEnglish ? 'See all tournaments' : 'Se alle turneringer'}
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
              <p className="text-slate-400 text-sm">
                {isEnglish ? 'Pro Clubs Tournaments' : 'Pro Clubs Turneringer'}
              </p>
            </div>
          </div>
          <Link href="/" className="pro11-button-secondary flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>{isEnglish ? 'Back' : 'Tilbake'}</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <div className="max-w-4xl w-full">
          {/* Payment Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              {isEnglish ? 'Payment information' : 'Betalingsinformasjon'}
            </h1>
            <p className="text-xl text-slate-300">
              {isEnglish ? 'Complete the registration for' : 'Fullfør registreringen av'} {paymentData.teamName}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Team Information */}
            <div className="pro11-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>{isEnglish ? 'Team information' : 'Laginformasjon'}</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">{isEnglish ? 'Team name' : 'Lagnavn'}</label>
                  <p className="text-lg font-semibold">{paymentData.teamName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">{isEnglish ? 'Captain' : 'Kaptein'}</label>
                  <p className="text-lg font-semibold">{paymentData.captainName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">{isEnglish ? 'Email' : 'E-post'}</label>
                  <p className="text-lg font-semibold">{paymentData.captainEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">{isEnglish ? 'Number of players' : 'Antall spillere'}</label>
                  <p className="text-lg font-semibold">
                    {paymentData.expectedPlayers} {isEnglish ? 'players' : 'spillere'}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="pro11-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>{isEnglish ? 'Payment details' : 'Betalingsdetaljer'}</span>
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">{isEnglish ? 'Tournament fee' : 'Turneringsgebyr'}</span>
                  <span className="text-2xl font-bold text-green-400">
                    {isFree ? (isEnglish ? 'FREE' : 'GRATIS') : `${paymentData.amount} NOK`}
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  {isFree ? (
                    <>
                      <p>• {isEnglish ? 'Registration is free' : 'Påmeldingen er gratis'}</p>
                      <p>• {isEnglish ? 'No payment is required' : 'Ingen betaling er nødvendig'}</p>
                    </>
                  ) : (
                    <>
                  <p>• {isEnglish ? 'Includes participation in the tournament' : 'Inkluderer deltakelse i turneringen'}</p>
                  <p>• {isEnglish ? 'All players on the team can participate' : 'Alle spillere på laget kan delta'}</p>
                  <p>• {isEnglish ? 'Payment is non-refundable' : 'Betalingen er ikke refunderbar'}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isFree ? (
            <div className="pro11-card p-6 mt-8">
              <h2 className="text-xl font-bold mb-4">{isEnglish ? 'Free registration' : 'Gratis påmelding'}</h2>
              <p className="text-slate-300 mb-6 text-center">
                {isEnglish
                  ? 'The registration fee is 0 NOK. No payment is required.'
                  : 'Påmeldingsavgiften er 0 kr. Ingen betaling er nødvendig.'}
              </p>
              <div className="text-center">
                <button
                  onClick={handleFreeRegistration}
                  disabled={isProcessing}
                  className="pro11-button w-full md:w-auto"
                >
                  {isProcessing ? (isEnglish ? 'Completing...' : 'Fullfører...') : (isEnglish ? 'Complete free registration' : 'Fullfør gratis påmelding')}
                </button>
                <p className="text-slate-400 text-sm mt-4">
                  {isEnglish
                    ? 'Your team will be approved immediately after completion.'
                    : 'Laget ditt blir godkjent umiddelbart etter fullføring.'}
                </p>
              </div>
            </div>
          ) : (
          <div className="pro11-card p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">{isEnglish ? 'Pay with PayPal' : 'Betaling med PayPal'}</h2>
            <p className="text-slate-300 mb-6 text-center">
              {isEnglish ? 'Safe and secure payment with PayPal' : 'Trygg og sikker betaling med PayPal'}
            </p>
            
            <div className="text-center">
              {paypalLoading ? (
                <div className="p-8">
                  <p className="text-slate-300">{isEnglish ? 'Loading PayPal configuration...' : 'Laster PayPal-konfigurasjon...'}</p>
                </div>
              ) : paypalClientId ? (
                <PayPalScriptProvider 
                  options={{ 
                    clientId: paypalClientId,
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
                <div className="p-8 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <p className="text-yellow-400 mb-4 font-semibold">
                    ⚠️ {isEnglish ? 'PayPal is not configured yet' : 'PayPal er ikke konfigurert ennå'}
                  </p>
                  <p className="text-slate-300 mb-4">
                    {isEnglish
                      ? 'To enable PayPal payments, add NEXT_PUBLIC_PAYPAL_CLIENT_ID to your environment variables.'
                      : 'For å aktivere PayPal-betaling, legg til NEXT_PUBLIC_PAYPAL_CLIENT_ID i miljøvariablene.'}
                  </p>
                  <p className="text-slate-400 text-sm mb-4">
                    {isEnglish
                      ? 'Until PayPal is configured, you cannot complete payment. Contact the administrator for help.'
                      : 'Inntil PayPal er konfigurert, kan du ikke fullføre betalingen. Kontakt administrator for hjelp.'}
                  </p>
                </div>
              )}
              
              <p className="text-slate-400 text-sm mt-4">
                {isEnglish
                  ? 'After successful payment your team will be approved for the tournament'
                  : 'Etter fullført betaling vil laget ditt bli godkjent for turneringen'}
              </p>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  )
} 