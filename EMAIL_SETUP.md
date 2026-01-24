# Email Notification Setup Guide

## Overview
Email notifications have been added to the Sagrada Familia Parish system for admin approval/rejection actions on:
- **Booking Requests** (Wedding, Baptism, Burial, etc.)
- **Donation Submissions** 
- **Volunteer Applications**

## Required Environment Variables

Add these variables to your `.env` file:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-parish-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Sagrada Familia Parish
SMTP_FROM_EMAIL=your-parish-email@gmail.com
```

## Gmail Setup Instructions

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password (not your regular password) in `SMTP_PASS`

## Other Email Providers

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

### Yahoo
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

### Custom SMTP Server
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587  # or 465 for SSL
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
1. **Added Dependencies**: `nodemailer@^6.9.8` in `package.json`
2. **New Service**: `services/EmailService.js` - Handles email sending and templates
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
1. **Authentication Error**: Check app password setup
2. **Connection Timeout**: Verify SMTP host and port
3. **No Email Sent**: Check if user has valid email address
4. **Template Issues**: Check console for HTML generation errors

### Error Handling:
- Email failures won't stop the approval/rejection process
- Errors are logged but don't affect core functionality
- Push notifications still work if email fails

## Security Notes

- Never commit real email credentials to git
- Use app passwords, not regular passwords
- Consider using environment-specific email addresses
- Monitor email sending quotas for your provider

## Future Enhancements

Potential improvements:
- Email delivery status tracking
- Admin notification preferences
- Email template customization through admin panel
- Bulk email notifications
- Email queue for high-volume sending