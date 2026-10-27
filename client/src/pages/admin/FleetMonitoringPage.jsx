import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/apiClient';
import { useSocket } from '../../context/SocketContext';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import L from 'leaflet';
import { createTileLayer, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../config/mapConfig';
import { Layers, Bike, Truck, RefreshCw, Radio } from 'lucide-react';

export const FleetMonitoringPage = () => {
  const { socket } = useSocket();
  const [fleetData, setFleetData] = useState({ onlineCouriers: [], activeOrders: [] });
  const [loading, setLoading] = useState(true);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const fetchFleet = async () => {
    try {
      const res = await api.get('/admin/fleet-live');
      setFleetData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  // Listen to live courier location broadcasts
  useEffect(() => {
    if (!socket) return;

    const handleFleetLocationUpdated = (data) => {
      setFleetData((prev) => {
        const couriers = [...prev.onlineCouriers];
        const idx = couriers.findIndex((c) => String(c.userId?._id) === String(data.partnerId));
        if (idx !== -1) {
          couriers[idx] = {
            ...couriers[idx],
            currentCoordinates: {
              type: 'Point',
              coordinates: [data.lng, data.lat]
            }
          };
        }
        return { ...prev, onlineCouriers: couriers };
      });
    };

    const handleOrderStatusUpdated = () => {
      fetchFleet();
    };

    socket.on('fleet_location_updated', handleFleetLocationUpdated);
    socket.on('order_status_updated', handleOrderStatusUpdated);

    return () => {
      socket.off('fleet_location_updated', handleFleetLocationUpdated);
      socket.off('order_status_updated', handleOrderStatusUpdated);
    };
  }, [socket]);

  // Render Leaflet Markers
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: DEFAULT_MAP_CENTER, // India metropolitan center default
        zoom: DEFAULT_MAP_ZOOM,
        zoomControl: true
      });

      createTileLayer().addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = [];

    // Draw Online Couriers with Stale Telemetry Detection
    fleetData.onlineCouriers.forEach((courier) => {
      const coords = courier.currentCoordinates?.coordinates;
      if (coords && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        const [lng, lat] = coords;
        const isStale = courier.lastLocationUpdate
          ? (Date.now() - new Date(courier.lastLocationUpdate).getTime() > 120000)
          : false;

        const icon = L.divIcon({
          className: 'courier-beacon',
          html: `
            <div style="
              background-color: ${isStale ? '#D97706' : '#059669'};
              width: 34px;
              height: 34px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 14px;
              border: 2px ${isStale ? 'dashed #B45309' : 'solid white'};
              box-shadow: ${isStale ? '0 2px 6px rgba(0,0,0,0.3)' : '0 0 0 4px rgba(16, 185, 129, 0.3), 0 3px 6px rgba(0,0,0,0.3)'};
            ">
              🛵
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`
            <strong>Courier: ${courier.userId?.name || 'Verified Partner'}</strong><br/>
            Vehicle: ${courier.vehicleType || 'Motorcycle'}<br/>
            Status: ${courier.isAvailable ? 'Available for dispatch' : 'Busy on active mission'}<br/>
            ${isStale ? '<span style="color:#B45309;font-weight:600;">⚠️ Stale GPS (&gt; 2 mins)</span>' : '<span style="color:#059669;font-weight:600;">🟢 Live Telemetry Beacon</span>'}
          `);

        markersRef.current.push(marker);
        bounds.push([lat, lng]);
      }
    });

    // Draw In-Flight Active Orders (Pickups & Dropoffs)
    fleetData.activeOrders.forEach((order) => {
      if (order.pickup?.coordinates) {
        const [pLng, pLat] = order.pickup.coordinates;
        const pMarker = L.marker([pLat, pLng], {
          icon: L.divIcon({
            className: 'pickup-beacon',
            html: `
              <div style="background-color: #2563EB; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; border: 2px solid white;">
                P
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        })
          .addTo(map)
          .bindPopup(`<strong>Order ${order.orderNumber} Pickup:</strong><br/>${order.pickup.address}`);
        markersRef.current.push(pMarker);
        bounds.push([pLat, pLng]);
      }

      if (order.dropoff?.coordinates) {
        const [dLng, dLat] = order.dropoff.coordinates;
        const dMarker = L.marker([dLat, dLng], {
          icon: L.divIcon({
            className: 'dropoff-beacon',
            html: `
              <div style="background-color: #16865C; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; border: 2px solid white;">
                D
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        })
          .addTo(map)
          .bindPopup(`<strong>Order ${order.orderNumber} Dropoff:</strong><br/>${order.dropoff.address}`);
        markersRef.current.push(dMarker);
        bounds.push([dLat, dLng]);
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [fleetData]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
            Geospatial Surveillance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
            Live Fleet Radar & Telemetry
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Real-time coordinates of active workforce and pending urban delivery waypoints
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-medium border border-emerald-200">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>{fleetData.onlineCouriers.length} Couriers Broadcasting</span>
          </div>

          <button
            onClick={fetchFleet}
            className="p-2 rounded-lg border border-ink-200 hover:bg-ink-100 text-ink-600 transition-colors"
            title="Refresh Fleet Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Full-width Map View */}
        <div className="lg:col-span-8">
          <Card noPadding className="overflow-hidden h-[380px] sm:h-[480px] lg:h-[540px]">
            <div ref={mapRef} className="w-full h-full" />
          </Card>
        </div>

        {/* Right Active Fleet List */}
        <div className="lg:col-span-4 space-y-4">
          <Card title="Online Couriers" subtitle="Broadcasting live telemetry">
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {fleetData.onlineCouriers.length === 0 ? (
                <p className="text-xs text-ink-400 py-4 text-center">No couriers online right now.</p>
              ) : (
                fleetData.onlineCouriers.map((c) => (
                  <div key={c._id} className="p-2.5 rounded-lg border border-ink-100 bg-ink-50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-ink-900 block">{c.userId?.name}</span>
                      <span className="text-[11px] text-ink-500 capitalize">{c.vehicleType}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      c.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {c.isAvailable ? 'Free' : 'Busy'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Active In-Flight Deliveries" subtitle="Orders currently being fulfilled">
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {fleetData.activeOrders.length === 0 ? (
                <p className="text-xs text-ink-400 py-4 text-center">No active deliveries on road.</p>
              ) : (
                fleetData.activeOrders.map((o) => (
                  <div key={o._id} className="p-2.5 rounded-lg border border-ink-100 bg-ink-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-ink-900">{o.orderNumber}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-[11px] text-ink-600 truncate">{o.dropoff?.address}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
