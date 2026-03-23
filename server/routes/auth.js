const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  console.log('🔑 Generating token for:', id);
  console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  console.log('📥 Register hit');
  console.log('📥 Body:', req.body);

  try {
    const { username, email, password } = req.body;

    console.log('📥 Fields:', { username, email, password: !!password });

    if (!username || !email || !password) {
      console.log('❌ Missing fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    console.log('🔍 Checking existing user...');
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({
        message:
          existingUser.email === email
            ? 'Email already registered'
            : 'Username already taken',
      });
    }

    console.log('👤 Creating user...');
    const user = await User.create({ username, email, password });
    console.log('✅ User created:', user._id);

    console.log('🔑 Generating token...');
    const token = generateToken(user._id);
    console.log('✅ Token generated');

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      token,
    });

    console.log('✅ Register response sent');
  } catch (error) {
    console.error('❌ Register error name:', error.name);
    console.error('❌ Register error message:', error.message);
    console.error('❌ Register error stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  console.log('📥 Login hit');
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // user.status = 'online';
    // await user.save();

    await User.updateOne({ _id: user._id }, { status: 'online' });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (username) user.username = username;
    if (avatar) user.avatar = avatar;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;