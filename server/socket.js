const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const Room = require('./models/Room');

// Map: userId -> socketId (for online presence)
const onlineUsers = new Map();

const socketHandler = (io) => {
  // ─── Auth Middleware for Socket ───────────────────────────────────────────
//   io.use(async (socket, next) => {
//     try {
//       const token = socket.handshake.auth.token;
//       if (!token) return next(new Error('Authentication error'));

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       const user = await User.findById(decoded.id).select('-password');
//       if (!user) return next(new Error('User not found'));

//       socket.user = user;
//       next();
//     } catch (err) {
//       next(new Error('Token invalid'));
//     }
//   });

// With this:
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication error: No token'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return next(new Error('Authentication error: Invalid token'));
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = user;
    return next();
  } catch (err) {
    return next(new Error(`Authentication error: ${err.message}`));
  }
});

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`🟢 ${user.username} connected [${socket.id}]`);

    // ─── Mark online ─────────────────────────────────────────────────────
    onlineUsers.set(user._id.toString(), socket.id);
    await User.findByIdAndUpdate(user._id, {
      status: 'online',
      socketId: socket.id,
    });

    // Broadcast presence to everyone
    io.emit('user:status', { userId: user._id, status: 'online' });

    // ─── Join Room ────────────────────────────────────────────────────────
    socket.on('room:join', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).populate(
          'members',
          'username avatar status'
        );
        if (!room) return socket.emit('error', { message: 'Room not found' });

        socket.join(roomId);

        // Send current online status of all room members
        const membersWithStatus = room.members.map((m) => ({
          ...m.toObject(),
          status: onlineUsers.has(m._id.toString()) ? 'online' : 'offline',
        }));

        socket.emit('room:members', membersWithStatus);

        // Notify room that user joined
        socket.to(roomId).emit('room:user_joined', {
          roomId,
          user: { _id: user._id, username: user.username, avatar: user.avatar },
        });

        console.log(`${user.username} joined room: ${room.name}`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ─── Leave Room ───────────────────────────────────────────────────────
    socket.on('room:leave', ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('room:user_left', {
        roomId,
        userId: user._id,
      });
    });

    // ─── Send Message ─────────────────────────────────────────────────────
    socket.on('message:send', async ({ roomId, content }) => {
      try {
        if (!content?.trim()) return;

        const message = await Message.create({
          room: roomId,
          sender: user._id,
          content: content.trim(),
        });

        // Update room's lastMessage
        await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

        const populated = await message.populate('sender', 'username avatar');

        // Broadcast to everyone in the room (including sender)
        io.to(roomId).emit('message:new', populated);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ─── Typing Indicators ────────────────────────────────────────────────
    socket.on('typing:start', ({ roomId }) => {
      socket.to(roomId).emit('typing:start', {
        roomId,
        user: { _id: user._id, username: user.username },
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(roomId).emit('typing:stop', {
        roomId,
        userId: user._id,
      });
    });

    // ─── Message Read ─────────────────────────────────────────────────────
    socket.on('message:read', async ({ messageId, roomId }) => {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { readBy: user._id },
      });
      socket.to(roomId).emit('message:read', {
        messageId,
        userId: user._id,
      });
    });

    // ─── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔴 ${user.username} disconnected`);

      onlineUsers.delete(user._id.toString());
      await User.findByIdAndUpdate(user._id, {
        status: 'offline',
        socketId: null,
      });

      io.emit('user:status', { userId: user._id, status: 'offline' });
    });
  });
};

module.exports = socketHandler;