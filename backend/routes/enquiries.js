const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');

// Configure email transporter using Gmail service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper to get all admin emails
const getAdminEmails = async () => {
  const admins = await Admin.find({}, { email: 1, _id: 0 });
  const emails = admins.map(admin => admin.email);
  if (emails.length === 0 && process.env.ADMIN_EMAIL) {
    emails.push(process.env.ADMIN_EMAIL);
  }
  return emails;
};

// General enquiry
router.post('/general', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      return res.status(500).json({ message: 'No admin email configured' });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER, // sender will be your Gmail address
      to: adminEmails.join(', '),
      subject: `New General Enquiry from ${name}`,
      html: `
        <h2>General Enquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Enquiry sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ message: 'Failed to send enquiry' });
  }
});

// Product/Service enquiry
router.post('/item', async (req, res) => {
  try {
    const { name, email, phone, message, itemName, itemType } = req.body;
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      return res.status(500).json({ message: 'No admin email configured' });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmails.join(', '),
      subject: `Enquiry about ${itemType}: ${itemName}`,
      html: `
        <h2>${itemType} Enquiry</h2>
        <p><strong>${itemType}:</strong> ${itemName}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Enquiry sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ message: 'Failed to send enquiry' });
  }
});

module.exports = router;