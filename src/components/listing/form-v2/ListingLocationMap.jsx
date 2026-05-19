import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
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

function MapClickHandler({ onCoordsChange }) {
  useMapEvents({
    click(e) {
      onCoordsChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapViewSync({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
      return undefined;
    }
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      try {
        map.invalidateSize({ animate: false });
        map.setView([Number(lat), Number(lng)], zoom ?? 14, { animate: false });
      } catch {
        /* carte pas prête */
      }
    };
    const id = window.requestAnimationFrame(() => window.requestAnimationFrame(run));
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [lat, lng, zoom, map]);
  return null;
}

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

/**
 * Carte interactive (legacy dashboard Address.jsx) — OpenStreetMap + clic / drag pin.
 */
export default function ListingLocationMap({ lat, lng, onCoordsChange, height = 300 }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const ok = hasValidCoords(lat, lng);

  const centerLat = ok ? Number(lat) : 33.5731;
  const centerLng = ok ? Number(lng) : -7.5898;
  const zoom = ok ? 14 : 6;

  useEffect(() => {
    if (!ok || !mapRef.current || !markerRef.current) return;
    try {
      mapRef.current.setView([Number(lat), Number(lng)], 14);
      markerRef.current.setLatLng([Number(lat), Number(lng)]);
    } catch {
      /* ignore */
    }
  }, [lat, lng, ok]);

  return (
    <MapContainer
      ref={mapRef}
      center={[centerLat, centerLng]}
      zoom={zoom}
      style={{ height, width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onCoordsChange={onCoordsChange} />
      <MapViewSync lat={ok ? lat : null} lng={ok ? lng : null} zoom={zoom} />
      {ok ? (
        <Marker
          position={[Number(lat), Number(lng)]}
          icon={listingPinIcon}
          ref={markerRef}
          draggable
          eventHandlers={{
            dragend(e) {
              const pos = e.target.getLatLng();
              onCoordsChange?.({ lat: pos.lat, lng: pos.lng });
            },
          }}
        >
          <Popup>Emplacement du logement</Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
