import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activeOffer, setActiveOffer] = useState(null);
  const [latestOrderUpdate, setLatestOrderUpdate] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const s = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log('⚡ [Socket] Connected to realtime dispatch engine, id:', s.id);
      setConnected(true);
    });

    s.on('disconnect', () => {
      console.log('🔌 [Socket] Disconnected from realtime dispatch');
      setConnected(false);
    });

    // Courier specific delivery offers
    s.on('order_offered', (offerData) => {
      console.log('📦 [Socket] Received Delivery Offer:', offerData);
      setActiveOffer(offerData);
      toast.info('New Delivery Offer', `Pickup at ${offerData.order.pickup.address.split(',')[0]} (Payout: $${offerData.order.pricing.partnerPayout.toFixed(2)})`);
    });

    s.on('offer_expired', ({ orderId }) => {
      console.log('⏰ [Socket] Offer expired:', orderId);
      setActiveOffer((prev) => (prev?.order?._id === orderId ? null : prev));
    });

    // Live order updates (assigned, picked_up, delivered, cancelled)
    s.on('order_status_updated', (payload) => {
      console.log('🔄 [Socket] Order status updated:', payload);
      setLatestOrderUpdate(payload);
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

  const updateLocation = (lat, lng) => {
    if (socket && connected) {
      socket.emit('courier_location_beacon', { lat, lng });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        activeOffer,
        clearActiveOffer,
        latestOrderUpdate,
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
