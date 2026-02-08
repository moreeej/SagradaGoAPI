let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (err) {
  console.error("Nodemailer not found. Please run: npm install nodemailer");
  nodemailer = null;
}

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if nodemailer is available
      if (!nodemailer || typeof nodemailer.createTransport !== 'function') {
        console.warn("Nodemailer is not available. Email functionality will be disabled.");
        console.warn("Please run: npm install nodemailer");
        return;
      }

      // Check if SMTP credentials are configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Email functionality will be disabled.");
        console.warn("Please add SMTP_USER and SMTP_PASS to your .env file.");
        return;
      }

      // Configure email transporter based on environment variables
      const emailConfig = {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER, // Your email
          pass: process.env.SMTP_PASS, // Your app password (for Gmail, generate an app password)
        },
        tls: {
          rejectUnauthorized: false,
        },
      };

      this.transporter = nodemailer.createTransport(emailConfig);
      this.isInitialized = true;

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error("Email service configuration error:", error);
        } else {
          console.log("Email service is ready to send messages");
        }
      });
    } catch (error) {
      console.error("Failed to initialize email transporter:", error);
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!this.isInitialized || !this.transporter) {
        console.warn("Email service not initialized. Skipping email send.");
        return { success: false, error: "Email service not initialized" };
      }

      if (!to || !subject || !htmlContent) {
        console.warn("Missing required email parameters");
        return { success: false, error: "Missing required email parameters" };
      }

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Sagrada Familia Parish'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }
  }

  // Helper method to strip HTML tags for plain text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  // Email templates for different scenarios
  generateBookingApprovalEmail(userName, bookingType, bookingDetails) {
    const { transaction_id, date, time, priest_name } = bookingDetails;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #27ae60; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .status-approved { color: #27ae60; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sagrada Familia Parish</h1>
            <p>Booking Confirmation</p>
          </div>
          <div class="content">
            <h2>Dear ${userName},</h2>
            <p>We are pleased to inform you that your <strong>${bookingType}</strong> booking has been <span class="status-approved">APPROVED</span>!</p>
            
            <div class="booking-details">
              <h3>Booking Details:</h3>
              <p><strong>Transaction ID:</strong> ${transaction_id}</p>
              <p><strong>Service:</strong> ${bookingType}</p>
              <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${time || 'TBA'}</p>
              ${priest_name ? `<p><strong>Officiating Priest:</strong> ${priest_name}</p>` : ''}
            </div>
            
            <p>Please make sure to arrive 15-30 minutes before your scheduled time. If you have any questions or need to make changes, please contact the parish office.</p>
            
            <p>God bless!</p>
          </div>
          <div class="footer">
            <p>Sagrada Familia Parish<br>
            Thank you for your faith and trust in our services.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateBookingRejectionEmail(userName, bookingType, bookingDetails, reason = null) {
    const { transaction_id, date, time } = bookingDetails;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #e74c3c; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .status-rejected { color: #e74c3c; font-weight: bold; }
          .contact-info { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sagrada Familia Parish</h1>
            <p>Booking Update</p>
          </div>
          <div class="content">
            <h2>Dear ${userName},</h2>
            <p>We regret to inform you that your <strong>${bookingType}</strong> booking has been <span class="status-rejected">DECLINED</span>.</p>
            
            <div class="booking-details">
              <h3>Booking Details:</h3>
              <p><strong>Transaction ID:</strong> ${transaction_id}</p>
              <p><strong>Service:</strong> ${bookingType}</p>
              <p><strong>Requested Date:</strong> ${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Requested Time:</strong> ${time || 'N/A'}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            
            <div class="contact-info">
              <h4>Need Assistance?</h4>
              <p>Please contact the parish office for more information about alternative dates or to discuss your booking requirements.</p>
            </div>
            
            <p>We apologize for any inconvenience and appreciate your understanding.</p>
            
            <p>God bless!</p>
          </div>
          <div class="footer">
            <p>Sagrada Familia Parish<br>
            Thank you for your faith and trust in our services.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateDonationApprovalEmail(userName, donationDetails) {
    const { amount, paymentMethod, intercession } = donationDetails;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .donation-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #27ae60; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .status-approved { color: #27ae60; font-weight: bold; }
          .amount { font-size: 18px; color: #27ae60; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sagrada Familia Parish</h1>
            <p>Donation Confirmation</p>
          </div>
          <div class="content">
            <h2>Dear ${userName},</h2>
            <p>Thank you for your generous heart! We are pleased to confirm that your donation has been <span class="status-approved">APPROVED</span> and received.</p>
            
            <div class="donation-details">
              <h3>Donation Details:</h3>
              <p><strong>Amount:</strong> <span class="amount">₱${amount?.toLocaleString() || '0'}</span></p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
              ${intercession ? `<p><strong>Prayer Intention:</strong> ${intercession}</p>` : ''}
              <p><strong>Status:</strong> <span class="status-approved">Confirmed</span></p>
            </div>
            
            <p>Your donation will help support our parish ministries and community outreach programs. We will include your prayer intentions in our masses.</p>
            
            <p>May God bless you abundantly for your generosity!</p>
          </div>
          <div class="footer">
            <p>Sagrada Familia Parish<br>
            "Give, and it will be given to you." - Luke 6:38</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateDonationRejectionEmail(userName, donationDetails, reason = null) {
    const { amount, paymentMethod } = donationDetails;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .donation-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #e74c3c; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .status-rejected { color: #e74c3c; font-weight: bold; }
          .contact-info { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sagrada Familia Parish</h1>
            <p>Donation Update</p>
          </div>
          <div class="content">
            <h2>Dear ${userName},</h2>
            <p>We have reviewed your donation submission and unfortunately, it has been <span class="status-rejected">DECLINED</span>.</p>
            
            <div class="donation-details">
              <h3>Donation Details:</h3>
              <p><strong>Amount:</strong> ₱${amount?.toLocaleString() || '0'}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
              <p><strong>Status:</strong> <span class="status-rejected">Declined</span></p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            
            <div class="contact-info">
              <h4>Need Assistance?</h4>
              <p>Please contact the parish office for more information or to resubmit your donation with the correct information.</p>
            </div>
            
            <p>We appreciate your generous intention and apologize for any inconvenience.</p>
            
            <p>God bless!</p>
          </div>
          <div class="footer">
            <p>Sagrada Familia Parish<br>
            Thank you for your continued support.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateVolunteerApprovalEmail(userName, volunteerDetails) {
    const { eventTitle, registration_type } = volunteerDetails;
    const isParticipant = registration_type === "participant";
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .volunteer-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #27ae60; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .status-approved { color: #27ae60; font-weight: bold; }
          .instructions { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sagrada Familia Parish</h1>
            <p>${isParticipant ? 'Event Registration' : 'Volunteer'} Confirmation</p>
          </div>
          <div class="content">
            <h2>Dear ${userName},</h2>
            <p>Congratulations! Your ${isParticipant ? 'event registration' : 'volunteer application'} has been <span class="status-approved">APPROVED</span>!</p>
            
            <div class="volunteer-details">
              <h3>${isParticipant ? 'Registration' : 'Volunteer'} Details:</h3>
              <p><strong>Event/Activity:</strong> ${eventTitle || 'General Volunteer'}</p>
              <p><strong>Type:</strong> ${isParticipant ? 'Participant' : 'Volunteer'}</p>
              <p><strong>Status:</strong> <span class="status-approved">Confirmed</span></p>
            </div>
            
            <div class="instructions">
              <h4>What's Next?</h4>
              <p>${isParticipant 
                ? 'Please wait for further instructions regarding the event details, schedule, and any required preparations.'
                : 'We will contact you soon with more details about your volunteer duties, schedule, and any orientation sessions.'
              }</p>
              <p>If you have any questions, please don't hesitate to contact the parish office.</p>
            </div>
            
            <p>Thank you for ${isParticipant ? 'participating in' : 'volunteering with'} our parish community!</p>
            
            <p>God bless!</p>
          </div>
          <div class="footer">
            <p>Sagrada Familia Parish<br>
            Building faith, serving community.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateVolunteerRejectionEmail(userName, volunteerDetails, reason = null) {
    const { eventTitle, registration_type } = volunteerDetails;
    const isParticipant = registration_type === "participant";
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .volunteer-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #e74c3c; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .status-rejected { color: #e74c3c; font-weight: bold; }
          .contact-info { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sagrada Familia Parish</h1>
            <p>${isParticipant ? 'Event Registration' : 'Volunteer Application'} Update</p>
          </div>
          <div class="content">
            <h2>Dear ${userName},</h2>
            <p>Thank you for your interest in ${isParticipant ? 'participating in our event' : 'volunteering with our parish'}. Unfortunately, your ${isParticipant ? 'registration' : 'application'} has been <span class="status-rejected">DECLINED</span>.</p>
            
            <div class="volunteer-details">
              <h3>${isParticipant ? 'Registration' : 'Application'} Details:</h3>
              <p><strong>Event/Activity:</strong> ${eventTitle || 'General Volunteer'}</p>
              <p><strong>Type:</strong> ${isParticipant ? 'Participant' : 'Volunteer'}</p>
              <p><strong>Status:</strong> <span class="status-rejected">Declined</span></p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            
            <div class="contact-info">
              <h4>Still Want to Help?</h4>
              <p>Please contact the parish office to discuss other opportunities or to get more information about future events and volunteer positions.</p>
            </div>
            
            <p>We appreciate your willingness to serve and encourage you to stay connected with our parish community.</p>
            
            <p>God bless!</p>
          </div>
          <div class="footer">
            <p>Sagrada Familia Parish<br>
            Thank you for your heart to serve.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateBookingReceivedEmail(userName, bookingType, bookingDetails) {
    const { transaction_id, date, time } = bookingDetails;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #3498db; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .status-received { color: #3498db; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sagrada Familia Parish</h1>
            <p>Booking Received</p>
          </div>
          <div class="content">
            <h2>Dear ${userName},</h2>
            <p>Your <strong>${bookingType}</strong> booking has been successfully received!</p>
            
            <div class="booking-details">
              <h3>Booking Details:</h3>
              <p><strong>Transaction ID:</strong> ${transaction_id}</p>
              <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
              <p><strong>Time:</strong> ${time || 'TBA'}</p>
              <p><strong>Status:</strong> <span class="status-received">Received</span></p>
            </div>

            <p>We will notify you once your booking is approved by the parish admin.</p>
            <p>Thank you for booking with us!</p>
          </div>
          <div class="footer">
            <p>Sagrada Familia Parish</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();