import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { fetchCrews, createCrew } from '@/lib/api';

export default function CrewPage() {
  const [crews, setCrews] = useState([]);
  const [name, setName] = useState('');
  const [skills, setSkills] = useState('');
  const [zone, setZone] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const loadCrews = async () => {
    const data = await fetchCrews();
    setCrews(data);
  };

  useEffect(() => {
    loadCrews();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    await createCrew({
      name,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      zone,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      phone: phone || undefined,
      email: email || undefined,
    });
    setName('');
    setSkills('');
    setZone('');
    setLat('');
    setLng('');
    setPhone('');
    setEmail('');
    loadCrews();
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-4">Crew Manager</h2>
      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-8 gap-4 bg-white p-4 shadow rounded">
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Crew name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Skills (comma‑separated)"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        />
        <input
          type="number"
          step="any"
          className="border p-2 rounded"
          placeholder="Latitude (optional)"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          type="number"
          step="any"
          className="border p-2 rounded"
          placeholder="Longitude (optional)"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
        />
        <input
          type="tel"
          className="border p-2 rounded"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="email"
          className="border p-2 rounded"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="col-span-full md:col-span-1 bg-primary text-white py-2 px-4 rounded hover:bg-orange-700" type="submit">
          Add Crew
        </button>
      </form>
      <table className="min-w-full bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Skills</th>
            <th className="px-4 py-2 text-left">Zone</th>
            <th className="px-4 py-2 text-left">Latitude</th>
            <th className="px-4 py-2 text-left">Longitude</th>
            <th className="px-4 py-2 text-left">Phone</th>
            <th className="px-4 py-2 text-left">Email</th>
          </tr>
        </thead>
        <tbody>
          {crews.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="px-4 py-2">{c.id}</td>
              <td className="px-4 py-2">{c.name}</td>
              <td className="px-4 py-2">{c.skills?.join(', ')}</td>
              <td className="px-4 py-2">{c.zone || ''}</td>
              <td className="px-4 py-2">{typeof c.lat === 'number' ? c.lat : ''}</td>
              <td className="px-4 py-2">{typeof c.lng === 'number' ? c.lng : ''}</td>
              <td className="px-4 py-2">{c.phone || ''}</td>
              <td className="px-4 py-2">{c.email || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}