import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export const DeliveryMap = ({
  pickupCoords,    // [lng, lat]
  dropoffCoords,   // [lng, lat]
  courierCoords,   // [lng, lat] or { lat, lng }
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
      // Baseline center: Midtown NYC coordinates [40.75, -73.98]
      const initialLat = pickupCoords ? pickupCoords[1] : 40.7549;
      const initialLng = pickupCoords ? pickupCoords[0] : -73.9840;

      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: true,
        attributionControl: true
      });

      // Premium CartoDB Positron / OSM clean tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const bounds = [];

    // Custom Icon Creators
    const createCustomIcon = (bgColor, iconText, isPulse = false) => {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${bgColor};
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: 700;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ${isPulse ? 'box-shadow: 0 0 0 8px rgba(52, 87, 229, 0.3);' : ''}
          ">
            ${iconText}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
      });
    };

    // 1. Pickup Marker
    if (pickupCoords && pickupCoords.length === 2) {
      const lat = pickupCoords[1];
      const lng = pickupCoords[0];
      const marker = L.marker([lat, lng], {
        icon: createCustomIcon('#2563EB', 'P')
      })
        .addTo(map)
        .bindPopup(`<strong>Pickup:</strong><br/>${pickupAddress}`);
      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    }

    // 2. Dropoff Marker
    if (dropoffCoords && dropoffCoords.length === 2) {
      const lat = dropoffCoords[1];
      const lng = dropoffCoords[0];
      const marker = L.marker([lat, lng], {
        icon: createCustomIcon('#16865C', 'D')
      })
        .addTo(map)
        .bindPopup(`<strong>Dropoff:</strong><br/>${dropoffAddress}`);
      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    }

    // 3. Courier Marker
    if (courierCoords) {
      const cLat = Array.isArray(courierCoords) ? courierCoords[1] : courierCoords.lat;
      const cLng = Array.isArray(courierCoords) ? courierCoords[0] : courierCoords.lng;
      if (cLat && cLng) {
        const marker = L.marker([cLat, cLng], {
          icon: createCustomIcon('#3457E5', '🛵', true)
        })
          .addTo(map)
          .bindPopup(`<strong>Courier: ${courierName}</strong><br/>Active live position beacon`);
        markersRef.current.push(marker);
        bounds.push([cLat, cLng]);
      }
    }

    // 4. Draw Route Polyline
    if (pickupCoords && dropoffCoords) {
      const p1 = [pickupCoords[1], pickupCoords[0]];
      const p2 = [dropoffCoords[1], dropoffCoords[0]];
      const routePoints = [p1];

      // If courier is in transit, route through courier
      if (courierCoords) {
        const cLat = Array.isArray(courierCoords) ? courierCoords[1] : courierCoords.lat;
        const cLng = Array.isArray(courierCoords) ? courierCoords[0] : courierCoords.lng;
        if (cLat && cLng) {
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

    return () => {
      // Map stays instantiated; markers are updated reactively
    };
  }, [pickupCoords, dropoffCoords, courierCoords, pickupAddress, dropoffAddress, courierName]);

  return (
    <div className={`relative overflow-hidden border border-ink-200 shadow-subtle ${className}`}>
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
};
