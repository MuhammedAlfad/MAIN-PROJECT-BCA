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
}

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

export const TripMap: React.FC<TripMapProps> = ({ locations, title = 'Trip Route' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const fetchRoute = async (coords: [number, number][]) => {
    if (coords.length < 2) return null;
    
    setRouteLoading(true);
    try {
      // Use OSRM API for actual road-based routing
      const waypoints = coords.map((c) => `${c[1]},${c[0]}`).join(';');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      setRouteLoading(false);
    }
    return null;
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([0, 0], 2);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);
    }

    const map = mapInstance.current;

    // Clear existing markers and polyline
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

    // Add markers for each location
    const bounds = L.latLngBounds([]);
    locations.forEach((location, index) => {
      const marker = L.marker([location.lat, location.lng], { icon: DefaultIcon })
        .bindPopup(`<strong>${location.name}</strong><br/>Stop ${index + 1}`)
        .addTo(map);
      
      markersRef.current.push(marker);
      bounds.extend([location.lat, location.lng]);
    });

    // Fetch and draw actual road-based route
    if (locations.length > 1) {
      const coords = locations.map((loc) => [loc.lat, loc.lng] as [number, number]);
      
      fetchRoute(coords).then((routeCoords) => {
        if (routeCoords && routeCoords.length > 0) {
          polylineRef.current = L.polyline(routeCoords, {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1.0,
          }).addTo(map);
        } else {
          // Fallback to straight line if route fails
          polylineRef.current = L.polyline(coords, {
            color: '#ef4444',
            weight: 2,
            opacity: 0.6,
            dashArray: '5, 5',
          }).addTo(map);
        }
      });
    }

    // Fit map to bounds with padding
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [locations]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 rounded-lg overflow-hidden">
      <div className="bg-blue-600 text-white p-3 font-semibold text-sm flex items-center justify-between">
        <span>{title}</span>
        {routeLoading && <span className="text-xs animate-pulse">Calculating route...</span>}
      </div>
      <div ref={mapRef} className="flex-1 min-h-96" />
      {locations.length > 0 && (
        <div className="bg-white border-t p-3 text-xs text-gray-600 max-h-24 overflow-y-auto">
          <div className="font-semibold mb-2">Route ({locations.length} stops):</div>
          <div className="space-y-1">
            {locations.map((loc, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-center text-xs leading-5 font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-gray-700 truncate">{loc.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripMap;
