const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Order = require('../models/Order');
const PartnerProfile = require('../models/PartnerProfile');

let io = null;

function initializeSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (env.isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy rejects socket connection from origin '${origin}'`));
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket Authentication middleware: supports registered users (JWT) and guest customer order tracking (trackingToken)
  io.use(async (socket, next) => {
    try {
      const trackingToken = socket.handshake.auth?.trackingToken;
      if (trackingToken) {
        const order = await Order.findOne({ trackingToken, trackingTokenRevoked: { $ne: true } })
          .select('_id orderNumber status businessId assignedPartnerId');
        if (!order) {
          return next(new Error('Invalid or revoked tracking token'));
        }
        socket.isCustomerTracker = true;
        socket.trackingOrderId = order._id.toString();
        socket.trackingOrderNumber = order.orderNumber;
        return next();
      }

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
    if (socket.isCustomerTracker) {
      const orderRoom = `order:${socket.trackingOrderId}`;
      socket.join(orderRoom);
      console.log(`📡 [Socket] Customer tracker connected for order ${socket.trackingOrderNumber} -> joined ${orderRoom}`);
      socket.on('disconnect', () => {
        console.log(`🔌 [Socket] Customer tracker disconnected [${socket.id}]`);
      });
      return;
    }

    const user = socket.user;
    console.log(`📡 [Socket] User connected: ${user.name} (${user.role}) [${socket.id}]`);

    // Join personal user room
    socket.join(`user:${user._id.toString()}`);
    // Join role room
    socket.join(`role:${user.role}`);

    // Join specific order room for live tracking (with authorization verification)
    socket.on('join_order_room', async ({ orderId }) => {
      if (!orderId) return;

      try {
        // Admins have platform-wide monitoring privileges
        if (user.role === 'admin') {
          socket.join(`order:${orderId.toString()}`);
          console.log(`📌 [Socket] Admin ${user.name} joined order tracking room: order:${orderId}`);
          return;
        }

        const order = await Order.findById(orderId).select('businessId assignedPartnerId offeredPartnerId');
        if (!order) {
          socket.emit('socket_error', { message: 'Order not found.' });
          return;
        }

        const currentUserId = user._id.toString();
        const businessOwnerId = order.businessId?._id ? order.businessId._id.toString() : order.businessId?.toString();
        const assignedPartnerId = order.assignedPartnerId?._id ? order.assignedPartnerId._id.toString() : order.assignedPartnerId?.toString();
        const offeredPartnerId = order.offeredPartnerId?._id ? order.offeredPartnerId._id.toString() : order.offeredPartnerId?.toString();

        const isAuthorized =
          businessOwnerId === currentUserId ||
          assignedPartnerId === currentUserId ||
          offeredPartnerId === currentUserId;

        if (isAuthorized) {
          socket.join(`order:${orderId.toString()}`);
          console.log(`📌 [Socket] ${user.name} (${user.role}) authorized & joined order tracking room: order:${orderId}`);
        } else {
          console.warn(`⛔ [Socket] Unauthorized join attempt by ${user.name} (${user.role}) to order:${orderId}`);
          socket.emit('unauthorized_room_join', {
            orderId,
            message: 'Forbidden: You are not authorized to track this delivery order.'
          });
        }
      } catch (err) {
        console.error('❌ [Socket Room Join Error]:', err.message);
      }
    });

    socket.on('leave_order_room', ({ orderId }) => {
      if (orderId) {
        socket.leave(`order:${orderId.toString()}`);
      }
    });

    // Partner live location beacon updates with coordinate validation, throttling, assignment guard, and DB sync
    socket.on('courier_location_beacon', async ({ lat, lng, activeOrderId }) => {
      if (user.role !== 'partner') return;

      const numLat = parseFloat(lat);
      const numLng = parseFloat(lng);

      // Validate numeric range
      if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
        return;
      }

      // In-memory throttling: max 1 beacon every 1.5 seconds per socket
      const now = Date.now();
      if (socket.lastBeaconAt && now - socket.lastBeaconAt < 1500) {
        return;
      }
      socket.lastBeaconAt = now;

      try {
        // Sync live coordinates to courier profile so matching engine uses current location
        await PartnerProfile.updateOne(
          { userId: user._id },
          {
            $set: {
              'currentCoordinates.type': 'Point',
              'currentCoordinates.coordinates': [numLng, numLat],
              lastLocationUpdate: new Date()
            }
          }
        );

        // Multi-order isolation guard: verify courier is assigned to this order and delivery is active
        if (activeOrderId) {
          const assignedOrder = await Order.findOne({
            _id: activeOrderId,
            assignedPartnerId: user._id,
            status: { $in: ['assigned', 'picked_up'] }
          }).select('_id status');

          if (assignedOrder) {
            io.to(`order:${activeOrderId}`).emit('courier_location_updated', {
              orderId: activeOrderId,
              partnerId: user._id,
              partnerName: user.name,
              lat: numLat,
              lng: numLng,
              timestamp: new Date()
            });
          }
        }

        // Broadcast to admin operations monitoring
        io.to('role:admin').emit('fleet_location_updated', {
          partnerId: user._id,
          name: user.name,
          lat: numLat,
          lng: numLng,
          timestamp: new Date()
        });
      } catch (beaconErr) {
        console.error('❌ [Socket Location Beacon Error]:', beaconErr.message);
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
  if (io && userId) {
    io.to(`user:${userId.toString()}`).emit(event, data);
  }
}

function emitToRole(role, event, data) {
  if (io && role) {
    io.to(`role:${role}`).emit(event, data);
  }
}

function emitToOrder(orderId, event, data) {
  if (io && orderId) {
    io.to(`order:${orderId.toString()}`).emit(event, data);
  }
}

function sanitizeOrder(order, { allowPin = false } = {}) {
  if (!order) return null;
  const obj = typeof order.toObject === 'function' ? order.toObject() : JSON.parse(JSON.stringify(order));
  delete obj.handoverPinHash;
  delete obj.handoverPinEncrypted;
  if (!allowPin) {
    delete obj.handoverPin;
  }
  return obj;
}

/**
 * Centralized order status broadcaster.
 * Dispatches live updates to all authorized parties without leaking delivery PINs.
 * Delivery PIN is disclosed exclusively to the customer via the authenticated tracking endpoint.
 */
function broadcastOrderStatus(order, extra = {}) {
  if (!order) return;

  try {
    const orderId = order._id.toString();
    const businessId = order.businessId?._id ? order.businessId._id.toString() : order.businessId?.toString();
    const assignedPartnerId = order.assignedPartnerId?._id ? order.assignedPartnerId._id.toString() : order.assignedPartnerId?.toString();
    const offeredPartnerId = order.offeredPartnerId?._id ? order.offeredPartnerId._id.toString() : order.offeredPartnerId?.toString();

    const basePayload = {
      orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      businessId,
      assignedPartnerId,
      offeredPartnerId,
      timestamp: new Date(),
      ...extra
    };

    const safeOrder = sanitizeOrder(order);

    // 1. Order tracking room (PIN stripped)
    emitToOrder(orderId, 'order_status_updated', {
      ...basePayload,
      order: safeOrder
    });

    // 2. Business merchant personal room (PIN stripped - accessible only via customer tracking link)
    if (businessId) {
      emitToUser(businessId, 'order_status_updated', {
        ...basePayload,
        order: safeOrder
      });
    }

    // 3. Assigned partner personal room (PIN strictly stripped)
    if (assignedPartnerId) {
      emitToUser(assignedPartnerId, 'order_status_updated', {
        ...basePayload,
        order: safeOrder
      });
    }

    // 4. Offered partner personal room (if applicable - PIN strictly stripped)
    if (offeredPartnerId && offeredPartnerId !== assignedPartnerId) {
      emitToUser(offeredPartnerId, 'order_status_updated', {
        ...basePayload,
        order: safeOrder
      });
    }

    // 5. Admin role room (PIN stripped)
    emitToRole('admin', 'order_status_updated', {
      ...basePayload,
      order: safeOrder
    });
  } catch (err) {
    console.error('❌ [Socket Broadcast Error]:', err.message);
  }
}

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitToOrder,
  broadcastOrderStatus,
  sanitizeOrder
};
