import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export const LocationPickerMap = ({
  coords,             // [lng, lat]
  onChange,           // ([lng, lat], addressHint) => void
  label = 'Select Point',
  className = 'h-64 w-full rounded-lg'
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const initialLat = coords ? coords[1] : 40.7505;
    const initialLng = coords ? coords[0] : -73.9842;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const newCoords = [parseFloat(lng.toFixed(5)), parseFloat(lat.toFixed(5))];
        if (onChange) {
          onChange(newCoords, `Selected Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Custom marker icon
    const markerIcon = L.divIcon({
      className: 'picker-icon',
      html: `
        <div style="
          background-color: #3457E5;
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });

    if (markerRef.current) {
      markerRef.current.remove();
    }

    if (coords && coords.length === 2) {
      markerRef.current = L.marker([coords[1], coords[0]], { icon: markerIcon })
        .addTo(map)
        .bindPopup(label)
        .openPopup();
      map.panTo([coords[1], coords[0]]);
    }
  }, [coords, label, onChange]);

  return (
    <div className={`relative overflow-hidden border border-ink-200 shadow-subtle ${className}`}>
      <div ref={mapRef} className="h-full w-full" />
      <div className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded text-xs font-medium text-ink-700 shadow-subtle border border-ink-200 pointer-events-none">
        Click map to reposition pin
      </div>
    </div>
  );
};
