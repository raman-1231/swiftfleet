const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

let io = null;

function initializeSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*', // Allows dev & preview clients
      methods: ['GET', 'POST']
    }
  });

  // JWT Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || user.status === 'suspended') {
        return next(new Error('User unauthorized or suspended'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid socket credentials: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`📡 [Socket] User connected: ${user.name} (${user.role}) [${socket.id}]`);

    // Join personal user room
    socket.join(`user:${user._id.toString()}`);
    // Join role room
    socket.join(`role:${user.role}`);

    // Join specific order room for live tracking
    socket.on('join_order_room', ({ orderId }) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        console.log(`📌 [Socket] ${user.name} joined order tracking room: order:${orderId}`);
      }
    });

    socket.on('leave_order_room', ({ orderId }) => {
      if (orderId) {
        socket.leave(`order:${orderId}`);
      }
    });

    // Partner live location beacon updates
    socket.on('courier_location_beacon', async ({ lat, lng, activeOrderId }) => {
      if (user.role === 'partner' && lat && lng) {
        // Broadcast location to the order room
        if (activeOrderId) {
          io.to(`order:${activeOrderId}`).emit('courier_location_updated', {
            orderId: activeOrderId,
            partnerId: user._id,
            partnerName: user.name,
            lat,
            lng,
            timestamp: new Date()
          });
        }
        // Broadcast to admins
        io.to('role:admin').emit('fleet_location_updated', {
          partnerId: user._id,
          name: user.name,
          lat,
          lng,
          timestamp: new Date()
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket] User disconnected: ${user.name} [${socket.id}]`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
}

function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId.toString()}`).emit(event, data);
  }
}

function emitToRole(role, event, data) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

function emitToOrder(orderId, event, data) {
  if (io) {
    io.to(`order:${orderId.toString()}`).emit(event, data);
  }
}

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitToOrder
};
