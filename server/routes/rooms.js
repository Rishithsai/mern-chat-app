const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/rooms - get all public rooms + user's rooms
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [{ type: 'public' }, { members: req.user._id }],
    })
      .populate('createdBy', 'username avatar')
      .populate('members', 'username avatar status')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/rooms - create a room
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, type } = req.body;

    const room = await Room.create({
      name,
      description,
      type: type || 'public',
      createdBy: req.user._id,
      members: [req.user._id],
    });

    // Add room to user's rooms list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { rooms: room._id },
    });

    const populated = await room.populate('createdBy', 'username avatar');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/rooms/:id/join
router.post('/:id/join', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.type === 'private' && !room.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Cannot join private room' });
    }

    await Room.findByIdAndUpdate(req.params.id, {
      $addToSet: { members: req.user._id },
    });
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { rooms: req.params.id },
    });

    res.json({ message: 'Joined room successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/rooms/:id/messages - paginated messages
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ room: req.params.id })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ room: req.params.id });

    res.json({
      messages: messages.reverse(),
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the room creator can delete it' });
    }

    await Message.deleteMany({ room: req.params.id });
    await room.deleteOne();

    res.json({ message: 'Room deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;