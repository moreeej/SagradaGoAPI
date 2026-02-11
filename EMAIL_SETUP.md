# Email Notification Setup Guide

## Overview
Email notifications have been added to the Sagrada Familia Parish system for admin approval/rejection actions on:
- **Booking Requests** (Wedding, Baptism, Burial, etc.)
- **Donation Submissions** 
- **Volunteer Applications**

## Required Environment Variables

Add these variables to your `.env` file:

```bash
# Brevo (Transactional Email) Configuration
BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=your-verified-sender-email@yourdomain.com

# Optional - sender display name
SMTP_FROM_NAME=Sagrada Familia Parish

# Legacy - also supported for sender email
SMTP_FROM_EMAIL=your-verified-sender-email@yourdomain.com
```

## Brevo Setup Instructions

1. **Create a Brevo account** at [brevo.com](https://www.brevo.com/)
2. **Get your API key**:
   - Go to Brevo Dashboard → SMTP & API → API Keys
   - Create a new API key (or use an existing one)
   - Copy the key (starts with `xkeysib-`)
3. **Verify your sender email**:
   - Go to Brevo → Senders & IP
   - Add and verify the email address you want to send from
   - Use this verified email in `BREVO_FROM_EMAIL` or `SMTP_FROM_EMAIL`
4. **Add to `.env`**:
   ```bash
   BREVO_API_KEY=xkeysib-your-actual-key-here
   BREVO_FROM_EMAIL=parish@yourdomain.com
   SMTP_FROM_NAME=Sagrada Familia Parish
   ```

## Email Templates Included

### Booking Approvals/Rejections
- Wedding booking confirmations
- Baptism booking confirmations  
- Burial booking confirmations
- Professional HTML templates with booking details
- Priest assignment information (when available)

### Donation Confirmations/Rejections
- Amount and payment method details
- Prayer intentions included
- Thank you messaging for approved donations

### Volunteer Confirmations/Rejections
- Event/activity information
- Participant vs Volunteer differentiation
- Next steps instructions

## Files Modified

### Backend Changes:
1. **Email Service**: `services/EmailService.js` - Uses Brevo Transactional API (no nodemailer required)
3. **Updated Controllers**:
   - `controllers/AdminDonationController.js` - Donation confirmations/rejections
   - `controllers/VolunteerController.js` - Volunteer confirmations/rejections
   - `controllers/WeddingController.js` - Wedding booking approvals/rejections
   - `controllers/BaptismController.js` - Baptism booking approvals/rejections
   - `controllers/BurialController.js` - Burial booking approvals/rejections

## Testing the Email Functionality

### 1. Install New Dependencies
```bash
cd SagradaGoAPI
npm install
```

### 2. Configure Environment Variables
- Add email settings to your `.env` file
- Test with a real email account first

### 3. Test Email Sending
You can test email functionality by:
- Approving/rejecting bookings through admin dashboard
- Confirming/cancelling donations through admin panel
- Confirming/declining volunteers through admin interface

### 4. Check Logs
Monitor console output for email sending status:
- `✅ Email sent successfully: [messageId]`
- `❌ Error sending email: [error details]`

## Email Flow

1. Admin performs approve/reject action in frontend
2. Backend API receives status update request
3. Database is updated with new status
4. Push notification is sent (existing functionality)
5. **NEW**: Email notification is sent to user
6. Success/error is logged in console

## Troubleshooting

### Common Issues:
1. **Authentication Error**: Verify `BREVO_API_KEY` is correct and not expired
2. **Sender Not Verified**: Ensure your sender email is verified in Brevo dashboard
3. **No Email Sent**: Check if user has valid email address
4. **Template Issues**: Check console for HTML generation errors

### Error Handling:
- Email failures won't stop the approval/rejection process
- Errors are logged but don't affect core functionality
- Push notifications still work if email fails

## Security Notes

- Never commit your Brevo API key to git (keep it in `.env` only)
- Ensure your sender email is verified in Brevo
- Brevo free tier includes 300 emails/day

## Future Enhancements

Potential improvements:
- Email delivery status tracking
- Admin notification preferences
- Email template customization through admin panel
- Bulk email notifications
- Email queue for high-volume sending