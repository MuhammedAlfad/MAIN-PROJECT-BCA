'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Location {
  name: string;
  lat: number;
  lng: number;
}

interface TripMapProps {
  locations: Location[];
  title?: string;
  showRouteList?: boolean;
}

const GLOBAL_ROUTE_CACHE = new Map<string, [number, number][]>();
const GLOBAL_IN_FLIGHT_ROUTE_REQUESTS = new Map<string, Promise<[number, number][] | null>>();
let GLOBAL_OSRM_COOLDOWN_UNTIL = 0;

// Fix leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export const TripMap: React.FC<TripMapProps> = ({
  locations,
  title = 'Trip Route',
  showRouteList = true,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const latestDrawRequestRef = useRef<number>(0);
  const [routeLoading, setRouteLoading] = useState(false);

  const getRouteKey = (coords: [number, number][]) =>
    coords.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join('|');

  const fetchRoute = async (coords: [number, number][]) => {
    if (coords.length < 2) return null;

    const routeKey = getRouteKey(coords);

    const cachedRoute = GLOBAL_ROUTE_CACHE.get(routeKey);
    if (cachedRoute) {
      return cachedRoute;
    }

    // Back off when public OSRM is rate-limiting.
    if (Date.now() < GLOBAL_OSRM_COOLDOWN_UNTIL) {
      return null;
    }

    const existingRequest = GLOBAL_IN_FLIGHT_ROUTE_REQUESTS.get(routeKey);
    if (existingRequest) {
      return existingRequest;
    }

    setRouteLoading(true);

    const requestPromise = (async () => {
      try {
        const waypoints = coords.map((c) => `${c[1]},${c[0]}`).join(';');
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`,
          { headers: { Accept: 'application/json' } }
        );

        if (response.status === 429) {
          // Cooldown to avoid hammering OSRM and repeated console noise.
          GLOBAL_OSRM_COOLDOWN_UNTIL = Date.now() + 60_000;
          return null;
        }

        if (!response.ok) {
          return null;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          return null;
        }

        const data = await response.json();
        if (data?.routes?.length > 0) {
          const route = data.routes[0];
          const routeCoords = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
          GLOBAL_ROUTE_CACHE.set(routeKey, routeCoords);
          return routeCoords;
        }
      } catch {
        // Ignore network errors and fallback to straight lines.
      }

      return null;
    })();

    GLOBAL_IN_FLIGHT_ROUTE_REQUESTS.set(routeKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      GLOBAL_IN_FLIGHT_ROUTE_REQUESTS.delete(routeKey);
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([0, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '(c) OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);
    }

    const map = mapInstance.current;

    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (locations.length === 0) {
      map.setView([0, 0], 2);
      return;
    }

    const bounds = L.latLngBounds([]);
    locations.forEach((location, index) => {
      const marker = L.marker([location.lat, location.lng], { icon: DefaultIcon })
        .bindPopup(`<strong>${location.name}</strong><br/>Stop ${index + 1}`)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([location.lat, location.lng]);
    });

    if (locations.length > 1) {
      const coords = locations.map((loc) => [loc.lat, loc.lng] as [number, number]);
      const drawRequestId = ++latestDrawRequestRef.current;

      fetchRoute(coords).then((routeCoords) => {
        if (drawRequestId !== latestDrawRequestRef.current) {
          return;
        }

        if (routeCoords && routeCoords.length > 0) {
          polylineRef.current = L.polyline(routeCoords, {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1.0,
          }).addTo(map);
        } else {
          polylineRef.current = L.polyline(coords, {
            color: '#ef4444',
            weight: 2,
            opacity: 0.6,
            dashArray: '5, 5',
          }).addTo(map);
        }
      });
    }

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [locations]);

  return (
    <div className="w-full h-full flex flex-col bg-[#10161f] rounded-lg overflow-hidden">
      <div className="bg-[#0b1320] border-b border-white/10 text-slate-100 p-3 font-semibold text-sm flex items-center justify-between">
        <span>{title}</span>
        {routeLoading && <span className="text-xs text-slate-300 animate-pulse">Calculating route...</span>}
      </div>
      <div ref={mapRef} className="flex-1 min-h-96" />
      {showRouteList && locations.length > 0 && (
        <div className="bg-[#0f1722] border-t border-white/10 p-3 text-xs text-slate-300 max-h-24 overflow-y-auto">
          <div className="font-semibold mb-2 text-slate-100">Route ({locations.length} stops):</div>
          <div className="space-y-1">
            {locations.map((loc, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-center text-xs leading-5 font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-slate-200 truncate">{loc.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripMap;
