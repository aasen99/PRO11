import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

const getTransporter = () => {
  if (!transporter) {
    const emailUser = process.env.EMAIL_USER
    const emailPass = process.env.EMAIL_PASS
    
    if (!emailUser || !emailPass) {
      console.warn('Missing email credentials - email functionality disabled')
      return null
    }
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })
  }
  
  return transporter
}

export const sendPaymentConfirmation = async (
  email: string,
  teamName: string,
  password: string,
  tournamentName: string
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Bekreftelse for ${teamName} - ${tournamentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">PRO11 - Betalingsbekreftelse</h2>
        <p>Hei!</p>
        <p>Din betaling for laget <strong>${teamName}</strong> i turneringen <strong>${tournamentName}</strong> er fullført.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #059669;">Lagkaptein-tilgang</h3>
          <p><strong>E-post:</strong> ${email}</p>
          <p><strong>Passord:</strong> <span style="font-family: monospace; background-color: #1f2937; color: #10b981; padding: 4px 8px; border-radius: 4px;">${password}</span></p>
        </div>
        
        <p>Du kan nå logge inn på <a href="https://pro11.no/captain/login">pro11.no/captain/login</a> for å administrere laget ditt.</p>
        
        <p>Med vennlig hilsen,<br>PRO11-teamet</p>
      </div>
    `,
  }

  const emailTransporter = getTransporter()
  if (!emailTransporter) {
    console.warn('Email service unavailable - skipping email send')
    return Promise.resolve()
  }
  
  return emailTransporter.sendMail(mailOptions)
} 