import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEmergency } from '@/contexts/EmergencyContext';

// Fix default marker icon issue with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom emergency marker icon
const emergencyIcon = L.divIcon({
  className: 'emergency-marker',
  html: `<div style="
    width: 30px; 
    height: 30px; 
    background: hsl(0, 84%, 60%); 
    border-radius: 50%; 
    border: 3px solid white;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <span style="color: white; font-size: 16px;">🆘</span>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// User location marker
const userIcon = L.divIcon({
  className: 'user-marker',
  html: `<div style="
    width: 20px; 
    height: 20px; 
    background: hsl(217, 91%, 60%); 
    border-radius: 50%; 
    border: 3px solid white;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface LocationMapProps {
  className?: string;
  showNearbyAlerts?: boolean;
  height?: string;
}

export const LocationMap: React.FC<LocationMapProps> = ({ 
  className = '', 
  showNearbyAlerts = false,
  height = '300px' 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const alertMarkersRef = useRef<L.Marker[]>([]);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  
  const { location, nearbyAlerts, isEmergencyActive, currentEmergency } = useEmergency();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Default to India center if no location
    const defaultCenter: L.LatLngExpression = [20.5937, 78.9629];
    
    mapInstanceRef.current = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update user location on map
  useEffect(() => {
    if (!mapInstanceRef.current || !location) return;

    const { latitude, longitude, accuracy } = location;
    const latLng: L.LatLngExpression = [latitude, longitude];

    // Update or create user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latLng);
    } else {
      userMarkerRef.current = L.marker(latLng, { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup('📍 Your Location');
    }

    // Update or create accuracy circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(latLng);
      accuracyCircleRef.current.setRadius(accuracy);
    } else {
      accuracyCircleRef.current = L.circle(latLng, {
        radius: accuracy,
        color: 'hsl(217, 91%, 60%)',
        fillColor: 'hsl(217, 91%, 60%)',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(mapInstanceRef.current);
    }

    // Center map on user location
    mapInstanceRef.current.setView(latLng, 15);
  }, [location]);

  // Show nearby emergency alerts
  useEffect(() => {
    if (!mapInstanceRef.current || !showNearbyAlerts) return;

    // Clear existing alert markers
    alertMarkersRef.current.forEach(marker => marker.remove());
    alertMarkersRef.current = [];

    // Add markers for each nearby alert
    nearbyAlerts.forEach(alert => {
      const marker = L.marker([alert.lat, alert.lng], { icon: emergencyIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="text-align: center;">
            <strong>🚨 Emergency Alert</strong><br/>
            <span>${alert.victimName}</span><br/>
            <small>Tap to help</small>
          </div>
        `);
      alertMarkersRef.current.push(marker);
    });
  }, [nearbyAlerts, showNearbyAlerts]);

  // Show current emergency location
  useEffect(() => {
    if (!mapInstanceRef.current || !isEmergencyActive || !currentEmergency) return;

    // Add emergency marker at current emergency location
    const emergencyMarker = L.marker([currentEmergency.lat, currentEmergency.lng], { 
      icon: emergencyIcon 
    })
      .addTo(mapInstanceRef.current)
      .bindPopup(`
        <div style="text-align: center;">
          <strong>🆘 Your Emergency</strong><br/>
          <span>Help is on the way</span>
        </div>
      `)
      .openPopup();

    return () => {
      emergencyMarker.remove();
    };
  }, [isEmergencyActive, currentEmergency]);

  return (
    <div 
      ref={mapRef} 
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ height, width: '100%' }}
    />
  );
};
