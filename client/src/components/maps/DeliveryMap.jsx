import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { createTileLayer, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../config/mapConfig';

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export const DeliveryMap = ({
  pickupCoords,        // [lng, lat]
  dropoffCoords,       // [lng, lat]
  courierCoords,       // [lng, lat] or { lat, lng, updatedAt }
  lastLocationUpdate,  // Date | string | number
  pickupAddress = 'Pickup Location',
  dropoffAddress = 'Dropoff Location',
  courierName = 'Assigned Courier',
  className = 'h-80 w-full rounded-lg'
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      // Baseline center: Indian metropolitan center default
      const initialLat = pickupCoords ? pickupCoords[1] : DEFAULT_MAP_CENTER[0];
      const initialLng = pickupCoords ? pickupCoords[0] : DEFAULT_MAP_CENTER[1];

      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: DEFAULT_MAP_ZOOM,
        zoomControl: true,
        attributionControl: true
      });

      createTileLayer().addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers & polylines
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const bounds = [];

    // Custom Icon Creators
    const createCustomIcon = (bgColor, iconText, isPulse = false, isStale = false) => {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${bgColor};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 13px;
            font-weight: 700;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ${isPulse ? 'box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.35);' : ''}
            ${isStale ? 'border: 2px dashed #D97706;' : ''}
          ">
            ${iconText}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
    };

    // 1. Pickup Marker
    if (pickupCoords && pickupCoords.length === 2 && !isNaN(pickupCoords[0]) && !isNaN(pickupCoords[1])) {
      const lat = pickupCoords[1];
      const lng = pickupCoords[0];
      const marker = L.marker([lat, lng], {
        icon: createCustomIcon('#2563EB', 'P')
      })
        .addTo(map)
        .bindPopup(`<strong>Pickup (Origin):</strong><br/>${pickupAddress}`);
      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    }

    // 2. Dropoff Marker
    if (dropoffCoords && dropoffCoords.length === 2 && !isNaN(dropoffCoords[0]) && !isNaN(dropoffCoords[1])) {
      const lat = dropoffCoords[1];
      const lng = dropoffCoords[0];
      const marker = L.marker([lat, lng], {
        icon: createCustomIcon('#16865C', 'D')
      })
        .addTo(map)
        .bindPopup(`<strong>Dropoff (Destination):</strong><br/>${dropoffAddress}`);
      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    }

    // 3. Courier Marker with Stale Signal Detection
    if (courierCoords) {
      const cLat = Array.isArray(courierCoords) ? courierCoords[1] : courierCoords.lat;
      const cLng = Array.isArray(courierCoords) ? courierCoords[0] : courierCoords.lng;
      const cTimestamp = courierCoords.updatedAt || lastLocationUpdate;

      if (cLat && cLng && !isNaN(cLat) && !isNaN(cLng)) {
        // Telemetry is considered stale if > 60 seconds have elapsed since last beacon
        const isStale = cTimestamp ? (Date.now() - new Date(cTimestamp).getTime() > 60000) : false;
        const timeAgoText = formatTimeAgo(cTimestamp);

        const courierIcon = isStale
          ? createCustomIcon('#D97706', '🛵', false, true) // Amber / dashed border for stale
          : createCustomIcon('#059669', '🛵', true, false);  // Emerald pulsing for live

        const popupContent = `
          <strong>Courier: ${courierName}</strong><br/>
          ${isStale
            ? `<span style="color:#B45309;font-weight:600;">⚠️ Stale GPS Signal</span><br/><small style="color:#78350F;">Last updated ${timeAgoText}. Position may be delayed.</small>`
            : `<span style="color:#059669;font-weight:600;">🟢 Live GPS Active</span><br/><small style="color:#065F46;">Real-time dispatch telemetry (${timeAgoText})</small>`
          }
        `;

        const marker = L.marker([cLat, cLng], { icon: courierIcon })
          .addTo(map)
          .bindPopup(popupContent);
        markersRef.current.push(marker);
        bounds.push([cLat, cLng]);
      }
    }

    // 4. Draw Route Polyline
    if (pickupCoords && dropoffCoords && pickupCoords.length === 2 && dropoffCoords.length === 2) {
      const p1 = [pickupCoords[1], pickupCoords[0]];
      const p2 = [dropoffCoords[1], dropoffCoords[0]];
      const routePoints = [p1];

      if (courierCoords) {
        const cLat = Array.isArray(courierCoords) ? courierCoords[1] : courierCoords.lat;
        const cLng = Array.isArray(courierCoords) ? courierCoords[0] : courierCoords.lng;
        if (cLat && cLng && !isNaN(cLat) && !isNaN(cLng)) {
          routePoints.push([cLat, cLng]);
        }
      }
      routePoints.push(p2);

      const polyline = L.polyline(routePoints, {
        color: '#3457E5',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6, 8',
        lineCap: 'round'
      }).addTo(map);

      polylineRef.current = polyline;
    }

    // Auto-fit bounds if we have points
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    }
  }, [pickupCoords, dropoffCoords, courierCoords, lastLocationUpdate, pickupAddress, dropoffAddress, courierName]);

  return (
    <div className={`relative overflow-hidden border border-ink-200 shadow-subtle ${className}`}>
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
};
