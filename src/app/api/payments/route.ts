import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabase } from '@/lib/supabase'
import { sendPaymentConfirmation } from '@/lib/email'

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

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: currency,
      metadata: {
        teamId: teamId,
        teamName: team.team_name as string,
        captainEmail: team.captain_email as string
      }
    })

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        team_id: teamId,
        amount: amount,
        currency: currency,
        status: 'pending',
        payment_method: 'stripe',
        stripe_payment_intent_id: paymentIntent.id
      })
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 400 })
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id
    })

  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, status, stripePaymentIntentId } = body

    // Update payment status
    const supabase = getSupabase()
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', paymentId)
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 400 })
    }

    // If payment completed, update team status and send email
    if (status === 'completed') {
      // Update team payment status
      await supabase
        .from('teams')
        .update({ 
          payment_status: 'completed',
          status: 'approved'
        })
        .eq('id', payment.team_id as string)

      // Get team info for email
      const { data: team } = await supabase
        .from('teams')
        .select('*, tournaments(*)')
        .eq('id', payment.team_id as string)
        .single()

      if (team) {
        // Send confirmation email
        await sendPaymentConfirmation(
          team.captain_email as string,
          team.team_name as string,
          team.generated_password as string,
          (team.tournaments as any)?.title as string
        )
      }
    }

    return NextResponse.json({ success: true, payment })

  } catch (error) {
    console.error('Payment update error:', error)
    return NextResponse.json({ error: 'Payment update failed' }, { status: 500 })
  }
} 