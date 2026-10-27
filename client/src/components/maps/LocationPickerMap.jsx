import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createTileLayer, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../config/mapConfig';
import { reverseGeocodeIndianCoords } from '../../utils/geocoding';
import { Crosshair, AlertCircle, Loader2 } from 'lucide-react';

export const LocationPickerMap = ({
  coords,             // [lng, lat]
  onChange,           // ([lng, lat], addressHint, pincodeHint) => void
  label = 'Select Point',
  className = 'h-64 w-full rounded-lg'
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);

  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapRef.current) return;

    const initialLat = coords ? coords[1] : DEFAULT_MAP_CENTER[0];
    const initialLng = coords ? coords[0] : DEFAULT_MAP_CENTER[1];

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: DEFAULT_MAP_ZOOM,
        zoomControl: true
      });

      createTileLayer().addTo(map);

      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        const newCoords = [parseFloat(lng.toFixed(5)), parseFloat(lat.toFixed(5))];
        setGeoError('');

        // Reverse geocode to get Indian street address and PIN code
        try {
          const rev = await reverseGeocodeIndianCoords(lat, lng);
          if (onChangeRef.current) {
            onChangeRef.current(newCoords, rev?.address || `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`, rev?.pincode || '');
          }
        } catch {
          if (onChangeRef.current) {
            onChangeRef.current(newCoords, `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`, '');
          }
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
      markerRef.current = null;
    }

    if (coords && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      markerRef.current = L.marker([coords[1], coords[0]], { icon: markerIcon })
        .addTo(map)
        .bindPopup(label)
        .openPopup();
      map.panTo([coords[1], coords[0]]);
    }
  }, [coords, label]);

  // Real browser HTML5 Geolocation handler
  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('Device geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const newCoords = [parseFloat(longitude.toFixed(5)), parseFloat(latitude.toFixed(5))];

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15);
        }

        try {
          const rev = await reverseGeocodeIndianCoords(latitude, longitude);
          if (onChangeRef.current) {
            onChangeRef.current(
              newCoords,
              rev?.address || `Detected Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
              rev?.pincode || ''
            );
          }
        } catch {
          if (onChangeRef.current) {
            onChangeRef.current(newCoords, `Detected Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, '');
          }
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Location access denied or unavailable. Please search your Indian address or click directly on the map.';
        if (err.code === 1) {
          msg = 'Location permission denied. Please search your Indian address or click on the map.';
        } else if (err.code === 2) {
          msg = 'Current position unavailable. Please search your Indian address or click on the map.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please search your Indian address or click on the map.';
        }
        setGeoError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div className={`relative overflow-hidden border border-ink-200 shadow-subtle ${className}`}>
      <div ref={mapRef} className="h-full w-full" />

      {/* Geolocation Detection Action Button */}
      <div className="absolute top-2 left-2 z-[400]">
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 bg-white/95 hover:bg-white text-ink-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-subtle border border-ink-200 transition-colors disabled:opacity-50"
          title="Detect Current GPS Location"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5 text-brand-600" />
          )}
          <span>{isLocating ? 'Detecting...' : 'Detect My Location'}</span>
        </button>
      </div>

      {/* Status Overlay Banner */}
      <div className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded text-xs font-medium text-ink-700 shadow-subtle border border-ink-200 pointer-events-none">
        {coords ? 'Click map to reposition pin' : 'Click map or detect location to set pin'}
      </div>

      {/* Error / Instruction Warning Banner */}
      {geoError && (
        <div className="absolute bottom-2 left-2 right-2 z-[400] bg-amber-50/95 border border-amber-300 text-amber-900 px-3 py-2 rounded-lg text-xs flex items-center gap-2 shadow-subtle">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="flex-1 leading-tight">{geoError}</span>
          <button
            type="button"
            onClick={() => setGeoError('')}
            className="text-amber-700 hover:text-amber-900 font-bold ml-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
