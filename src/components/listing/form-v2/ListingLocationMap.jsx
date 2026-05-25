import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const homeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><defs><filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/></filter></defs><path d="M40 5 C20 5 5 25 5 50 C5 75 40 95 40 95 C40 95 75 75 75 50 C75 25 60 5 40 5 Z" fill="#b8851a" filter="url(#shadow)"/><circle cx="40" cy="42" r="25" fill="white"/><path d="M40 25 L40 60 M28 37 L52 37 M28 47 L52 47" stroke="#b8851a" stroke-width="5" stroke-linecap="round"/></svg>`;

const listingPinIcon = new L.DivIcon({
  html: `<div style="display:flex;justify-content:center;align-items:center;width:38px;height:38px">${homeIconSvg}</div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

const DEFAULT_CENTER = [33.5731, -7.5898];
const DEFAULT_ZOOM = 6;
const PIN_ZOOM = 14;

function hasValidCoords(lat, lng) {
  return (
    lat != null &&
    lng != null &&
    Number(lat) !== 0 &&
    Number(lng) !== 0 &&
    !Number.isNaN(Number(lat)) &&
    !Number.isNaN(Number(lng))
  );
}

function scheduleMapResize(map) {
  const run = () => {
    try {
      map.invalidateSize({ animate: false });
    } catch {
      /* carte pas prête */
    }
  };
  window.requestAnimationFrame(() => window.requestAnimationFrame(run));
}

/**
 * Carte interactive — Leaflet impératif (évite react-leaflet + StrictMode « already initialized »).
 */
export default function ListingLocationMap({ lat, lng, onCoordsChange, height = 300 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onCoordsChangeRef = useRef(onCoordsChange);
  onCoordsChangeRef.current = onCoordsChange;

  const ok = hasValidCoords(lat, lng);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || el.offsetHeight < 8) return undefined;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }

    const startLat = ok ? Number(lat) : DEFAULT_CENTER[0];
    const startLng = ok ? Number(lng) : DEFAULT_CENTER[1];
    const startZoom = ok ? PIN_ZOOM : DEFAULT_ZOOM;

    const map = L.map(el, { scrollWheelZoom: true }).setView([startLat, startLng], startZoom);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on('click', (e) => {
      onCoordsChangeRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    if (ok) {
      const marker = L.marker([Number(lat), Number(lng)], {
        icon: listingPinIcon,
        draggable: true,
      }).addTo(map);
      marker.bindPopup('Emplacement du logement');
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onCoordsChangeRef.current?.({ lat: pos.lat, lng: pos.lng });
      });
      markerRef.current = marker;
    }

    scheduleMapResize(map);

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleMapResize(map))
        : null;
    ro?.observe(el);

    return () => {
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init unique par montage du conteneur (parent peut forcer via key={mapKey})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (ok) {
      const latN = Number(lat);
      const lngN = Number(lng);

      if (markerRef.current) {
        markerRef.current.setLatLng([latN, lngN]);
      } else {
        const marker = L.marker([latN, lngN], {
          icon: listingPinIcon,
          draggable: true,
        }).addTo(map);
        marker.bindPopup('Emplacement du logement');
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onCoordsChangeRef.current?.({ lat: pos.lat, lng: pos.lng });
        });
        markerRef.current = marker;
      }

      try {
        map.setView([latN, lngN], PIN_ZOOM, { animate: false });
      } catch {
        /* ignore */
      }
    } else if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
      try {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
      } catch {
        /* ignore */
      }
    }

    scheduleMapResize(map);
  }, [lat, lng, ok]);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}
