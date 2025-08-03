import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import { fetchCrews, fetchJobs } from '@/lib/api';

// Dynamically import react‑leaflet components to avoid SSR issues.
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

import L from 'leaflet';

// Fix Leaflet's default icon paths (required when using Leaflet with Next.js)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons for crews and jobs
const crewIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const jobIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function MapPage() {
  const [crews, setCrews] = useState([]);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    async function load() {
      const [crewsData, jobsData] = await Promise.all([fetchCrews(), fetchJobs()]);
      setCrews(crewsData);
      setJobs(jobsData);
    }
    load();
  }, []);

  // Compute center of map: average of all coordinates; fallback to 0,0
  let center = [0, 0];
  const allCoords = [];
  crews.forEach((c) => {
    if (typeof c.lat === 'number' && typeof c.lng === 'number' && (c.lat !== 0 || c.lng !== 0)) {
      allCoords.push([c.lat, c.lng]);
    }
  });
  jobs.forEach((j) => {
    if (typeof j.lat === 'number' && typeof j.lng === 'number' && (j.lat !== 0 || j.lng !== 0)) {
      allCoords.push([j.lat, j.lng]);
    }
  });
  if (allCoords.length > 0) {
    const avgLat = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
    const avgLng = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
    center = [avgLat, avgLng];
  }

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-4">Live Dispatch Map</h2>
      {/* Only render map on client side */}
      <div className="h-[500px] w-full">
        {typeof window !== 'undefined' && (
          <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {crews.map((c) => (
              (typeof c.lat === 'number' && typeof c.lng === 'number') && (
                <Marker key={`crew-${c.id}`} position={[c.lat, c.lng]} icon={crewIcon}>
                  <Popup>
                    <strong>{c.name}</strong><br />
                    Skills: {c.skills?.join(', ') || 'None'}
                  </Popup>
                </Marker>
              )
            ))}
            {jobs.map((j) => (
              (typeof j.lat === 'number' && typeof j.lng === 'number') && (
                <Marker key={`job-${j.id}`} position={[j.lat, j.lng]} icon={jobIcon}>
                  <Popup>
                    <strong>Job #{j.id}</strong><br />
                    {j.description || ''}<br />
                    Status: {j.status || 'Scheduled'}
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        )}
      </div>
    </Layout>
  );
}