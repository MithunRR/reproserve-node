const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');

// Socket layer for live chat.
//
//   Client → server events
//     message:send       { receiverId, content }      → persists + broadcasts
//     message:read       { peerId }                   → marks peer's msgs read
//
//   Server → client events
//     message:new        Message                      → sent to both rooms
//     message:read       { by, peerId }               → echoed to peer
//
// Each authenticated socket joins room  user:<id>  so that a server-side
// emit to one room reaches every tab that user has open.

const userAttrs = ['id', 'firstName', 'lastName', 'email', 'role', 'businessName'];

function initChatSocket(io, db) {
  const { Message, User } = db;

  io.use((socket, next) => {
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.query?.token ||
      (socket.handshake?.headers?.authorization || '').replace(/^Bearer\s+/i, '');

    if (!token) return next(new Error('No token provided'));

    jwt.verify(token, authConfig.secret, (err, decoded) => {
      if (err) return next(new Error('Invalid or expired token'));
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    });
  });

  io.on('connection', (socket) => {
    const room = `user:${socket.userId}`;
    socket.join(room);

    socket.on('message:send', async (payload, ack) => {
      try {
        const receiverId = Number(payload?.receiverId);
        const content = (payload?.content || '').toString().trim();
        if (!receiverId || !content) {
          if (typeof ack === 'function') ack({ ok: false, error: 'receiverId and content required' });
          return;
        }
        if (receiverId === Number(socket.userId)) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Cannot message yourself' });
          return;
        }

        const receiver = await User.findByPk(receiverId, { attributes: ['id'] });
        if (!receiver) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Recipient not found' });
          return;
        }

        const record = await Message.create({
          senderId: socket.userId,
          receiverId,
          content
        });

        // Re-fetch with associations so the client receives sender/receiver info.
        const enriched = await Message.findByPk(record.id, {
          include: [
            { model: User, as: 'sender',   attributes: userAttrs },
            { model: User, as: 'receiver', attributes: userAttrs }
          ]
        });

        io.to(`user:${receiverId}`).emit('message:new', enriched);
        io.to(`user:${socket.userId}`).emit('message:new', enriched);

        if (typeof ack === 'function') ack({ ok: true, data: enriched });
      } catch (err) {
        console.error('[socket] message:send failed:', err.message);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('message:read', async (payload) => {
      try {
        const peerId = Number(payload?.peerId);
        if (!peerId) return;
        await Message.update(
          { isRead: true },
          { where: { senderId: peerId, receiverId: socket.userId, isRead: false } }
        );
        io.to(`user:${peerId}`).emit('message:read', { by: socket.userId, peerId });
      } catch (err) {
        console.error('[socket] message:read failed:', err.message);
      }
    });
  });
}

module.exports = { initChatSocket };
