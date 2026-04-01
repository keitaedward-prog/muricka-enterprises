const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin._id, email: admin.email } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create default admin (run once)
router.get('/setup', async (req, res) => {
  try {
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
      return res.json({ message: 'Admin already exists' });
    }
    const admin = new Admin({ email: process.env.ADMIN_EMAIL, password: 'admin123' });
    await admin.save();
    res.json({ message: 'Admin created. Email: ' + process.env.ADMIN_EMAIL + ', Password: admin123' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== Admin Management Routes (Protected) ==========
// List all admins (except password field)
router.get('/admins', auth, async (req, res) => {
  try {
    const admins = await Admin.find({}, { password: 0 }); // exclude password
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new admin
router.post('/admins', auth, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Admin already exists' });
    }
    const admin = new Admin({ email, password });
    await admin.save();
    // Return admin without password
    res.status(201).json({ id: admin._id, email: admin.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an admin (reset password or change email) - UPDATED: let model hash password
router.put('/admins/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Admin ID is required' });
    const { email, password } = req.body;
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (email) admin.email = email;
    if (password) admin.password = password; // Let the pre-save hook hash it
    await admin.save();
    res.json({ id: admin._id, email: admin.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Delete an admin (prevent deleting the last admin)
router.delete('/admins/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const adminToDelete = await Admin.findById(id);
    if (!adminToDelete) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    // Prevent deleting the last admin
    const adminCount = await Admin.countDocuments();
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the only admin account' });
    }
    // Prevent deleting yourself? Optional, but we can allow.
    // If you want to prevent self-deletion:
    if (req.adminId === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    await Admin.findByIdAndDelete(id);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;