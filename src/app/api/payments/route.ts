import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, amount, currency = 'nok' } = body

    // Get team information
    const supabase = getSupabase()
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*, tournaments(*)')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        team_id: teamId,
        amount: amount,
        currency: currency,
        status: 'pending',
        payment_method: 'paypal'
      })
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 400 })
    }

    return NextResponse.json({
      paymentId: payment.id,
      amount: amount,
      currency: currency
    })

  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, status, paypalOrderId, stripePaymentIntentId } = body

    // Update payment status
    const supabase = getSupabase()
    const updateData: any = { status }
    
    // Add PayPal order ID if provided
    if (paypalOrderId) {
      updateData.stripe_payment_intent_id = paypalOrderId // Reusing this field for PayPal order ID
    } else if (stripePaymentIntentId) {
      updateData.stripe_payment_intent_id = stripePaymentIntentId
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 400 })
    }

    // If payment completed, update team status
    if (status === 'completed') {
      // Update team payment status
      await supabase
        .from('teams')
        .update({ 
          payment_status: 'completed',
          status: 'approved'
        })
        .eq('id', payment.team_id as string)
    }

    return NextResponse.json({ success: true, payment })

  } catch (error) {
    console.error('Payment update error:', error)
    return NextResponse.json({ error: 'Payment update failed' }, { status: 500 })
  }
} 