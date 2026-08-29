import 'server-only'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Resend } from 'resend'

const concertHeroUrl = 'https://touraligner.com/concert-hero.jpg'

const confirmationText = `You’re officially on the waitlist!

We’ll let you know the moment things are ready—no carrier pigeons, just email!

While you wait, give your profile page a little love! Add the good photos, tighten up the bio, and make it look like somewhere people actually want to end up!

We’ll be in touch soon! Stay sharp!`

const confirmationHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background-color:#161616;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" background="${concertHeroUrl}" style="background-color:#161616;background-image:url('${concertHeroUrl}');background-position:center center;background-repeat:no-repeat;background-size:cover;">
      <tr>
        <td align="center" style="padding:32px 16px;background-color:rgba(0,0,0,0.42);">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:rgba(24,24,24,0.92);border-radius:24px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:30px 40px;background-color:#1b1b1b;">
                <img src="cid:touraligner-logo" width="230" alt="TourAligner" style="display:block;width:100%;max-width:230px;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td style="padding:44px 40px 28px;">
                <p style="margin:0 0 16px;color:#fd6a2f;font-size:12px;font-weight:700;letter-spacing:1.8px;line-height:18px;text-transform:uppercase;">Waitlist confirmed!</p>
                <h1 style="margin:0 0 24px;color:#ffffff;font-size:34px;font-weight:700;letter-spacing:-0.6px;line-height:40px;">You’re officially on the waitlist!</h1>
                <p style="margin:0 0 20px;color:#f0f0f0;font-size:17px;line-height:27px;">We’ll let you know the moment things are ready—no carrier pigeons, just email!</p>
                <p style="margin:0 0 20px;color:#f0f0f0;font-size:17px;line-height:27px;">While you wait, give your profile page a little love! Add the good photos, tighten up the bio, and make it look like somewhere people actually want to end up!</p>
                <p style="margin:0;color:#f0f0f0;font-size:17px;line-height:27px;">We’ll be in touch soon! Stay sharp!</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 40px;">
                <div style="height:1px;background-color:#555555;font-size:1px;line-height:1px;">&nbsp;</div>
                <p style="margin:20px 0 0;color:#c0c0c0;font-size:12px;line-height:18px;">Built for artists who would rather play the show than chase the logistics.</p>
                <p style="margin:22px 0 10px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1.4px;line-height:18px;text-transform:uppercase;">Follow TourAligner</p>
                <p style="margin:0;color:#fd6a2f;font-size:14px;font-weight:700;line-height:22px;">
                  <a href="https://www.instagram.com/touraligner/" style="color:#fd6a2f;text-decoration:none;">Instagram</a>
                  <span style="color:#777777;padding:0 8px;">•</span>
                  <a href="https://www.tiktok.com/@touraligner?lang=en" style="color:#fd6a2f;text-decoration:none;">TikTok</a>
                  <span style="color:#777777;padding:0 8px;">•</span>
                  <a href="https://www.facebook.com/profile.php?id=61590592556263" style="color:#fd6a2f;text-decoration:none;">Facebook</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

async function getInlineImageAttachment(
  relativePath: string,
  filename: string,
  contentId: string,
  contentType: string
) {
  const content = await readFile(join(process.cwd(), 'public', relativePath), 'base64')

  return {
    content,
    contentId,
    contentType,
    filename,
  }
}

export async function sendWaitlistConfirmation(email: string) {
  const apiKey = process.env.RESEND_SEND_EMAIL

  if (!apiKey) {
    console.error('RESEND_SEND_EMAIL is not configured; waitlist confirmation email was not sent.')
    return
  }

  try {
    const resend = new Resend(apiKey)
    const logo = await getInlineImageAttachment(
      'branding/touraligner-logo.png',
      'touraligner-logo.png',
      'touraligner-logo',
      'image/png'
    )
    const { error } = await resend.emails.send({
      attachments: [logo],
      from: 'TourAligner <hello@touraligner.com>',
      to: [email],
      subject: 'You’re officially on the TourAligner waitlist!',
      text: confirmationText,
      html: confirmationHtml,
    })

    if (error) {
      console.error('Failed to send waitlist confirmation email.', error)
    }
  } catch (error) {
    console.error('Failed to send waitlist confirmation email.', error)
  }
}
