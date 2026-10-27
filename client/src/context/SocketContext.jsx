import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { formatINR } from '../utils/currency';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [activeOffer, setActiveOffer] = useState(null);
  const [latestOrderUpdate, setLatestOrderUpdate] = useState(null);
  const [connectionEpoch, setConnectionEpoch] = useState(Date.now());

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
        setConnectionStatus('disconnected');
      }
      return;
    }

    const rawEndpoint = (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin).trim();
    const socketEndpoint = rawEndpoint.replace(/\/api\/?$/, '').replace(/\/$/, '');

    setConnectionStatus('reconnecting');

    const s = io(socketEndpoint, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    s.on('connect', () => {
      console.log('⚡ [Socket] Connected to realtime dispatch engine, id:', s.id);
      setConnected(true);
      setConnectionStatus('connected');
      setConnectionEpoch(Date.now());
    });

    s.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Disconnected from realtime dispatch:', reason);
      setConnected(false);
      setConnectionStatus(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting');
    });

    s.on('connect_error', (error) => {
      console.warn('⚠️ [Socket] Connection error:', error?.message || error);
      setConnected(false);
      setConnectionStatus('reconnecting');
    });

    if (s.io) {
      s.io.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 [Socket] Reconnection attempt #${attempt}...`);
        setConnected(false);
        setConnectionStatus('reconnecting');
      });

      s.io.on('reconnect', () => {
        console.log('⚡ [Socket] Successfully reconnected to dispatch engine');
        setConnected(true);
        setConnectionStatus('connected');
        setConnectionEpoch(Date.now());
      });

      s.io.on('reconnect_failed', () => {
        console.error('❌ [Socket] Reconnection failed after maximum attempts');
        setConnected(false);
        setConnectionStatus('disconnected');
      });
    }

    // Courier specific delivery offers
    s.on('order_offered', (offerData) => {
      console.log('📦 [Socket] Received Delivery Offer:', offerData);
      setActiveOffer(offerData);
      if (offerData.order) {
        const pickupArea = offerData.order.pickup?.address ? offerData.order.pickup.address.split(',')[0] : 'Merchant';
        const payout = offerData.order.pricing?.partnerPayout ? formatINR(offerData.order.pricing.partnerPayout) : '';
        toast.info('New Delivery Offer', `Pickup at ${pickupArea} (${payout})`);
      }
    });

    s.on('offer_expired', ({ orderId }) => {
      console.log('⏰ [Socket] Offer expired:', orderId);
      setActiveOffer((prev) => (prev?.order?._id === orderId ? null : prev));
    });

    // Live order updates (assigned, picked_up, delivered, cancelled)
    s.on('order_status_updated', (payload) => {
      console.log('🔄 [Socket] Order status updated:', payload);
      setLatestOrderUpdate(payload);

      // If active offer was assigned to anyone or cancelled, dismiss offer card
      if (payload.status !== 'offered') {
        setActiveOffer((prev) => (prev?.order?._id === payload.orderId ? null : prev));
      }

      if (payload.status === 'delivered') {
        toast.success('Delivery Completed', `Order #${payload.orderNumber} has been delivered successfully.`);
      } else if (payload.status === 'picked_up') {
        toast.info('Order In Transit', `Order #${payload.orderNumber} is now picked up and in transit.`);
      } else if (payload.status === 'assigned') {
        toast.info('Partner Assigned', `Partner has accepted Order #${payload.orderNumber}.`);
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [isAuthenticated, token]);

  const clearActiveOffer = () => {
    setActiveOffer(null);
  };

  const setOffer = (offer) => {
    setActiveOffer(offer);
  };

  const updateLocation = (lat, lng, activeOrderId = null) => {
    if (socket && connected) {
      socket.emit('courier_location_beacon', { lat, lng, activeOrderId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        connectionStatus,
        activeOffer,
        setOffer,
        clearActiveOffer,
        latestOrderUpdate,
        connectionEpoch,
        updateLocation
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
