import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { fetchJobs, fetchCrews, createJob, updateJobStatus, fetchClients } from '@/lib/api';
import { fetchInvoice } from '@/lib/api';

// Import AI optimisation function
import { optimizeJobs } from '@/lib/api';
import { useRouter } from 'next/router';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [crews, setCrews] = useState([]);
  const [clients, setClients] = useState([]);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  // Crew assignment for new job; store ID as string when selecting
  const [newCrewId, setNewCrewId] = useState('');
  const [date, setDate] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [zone, setZone] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [role, setRole] = useState('');
  const [clientId, setClientId] = useState('');
  // Authenticated user's crewId (for crew role)
  const [userCrewId, setUserCrewId] = useState(null);

  // AI suggestions for assignments
  const [suggestions, setSuggestions] = useState([]);

  // Currently selected invoice to display
  const [invoice, setInvoice] = useState(null);

  const router = useRouter();

  const loadData = async () => {
    const [jobsData, crewsData, clientsData] = await Promise.all([fetchJobs(), fetchCrews(), fetchClients()]);
    setJobs(jobsData);
    setCrews(crewsData);
    setClients(clientsData);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load role from localStorage to control status editing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('role');
      if (storedRole) setRole(storedRole);
      const storedCrewId = localStorage.getItem('crewId');
      if (storedCrewId) setUserCrewId(parseInt(storedCrewId, 10));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !address) return;
    try {
      await createJob({
        description,
        address,
        crewId: newCrewId ? parseInt(newCrewId) : null,
        date,
        requiredSkills: requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        zone,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        clientId: clientId ? parseInt(clientId) : null,
      });
      setDescription('');
      setAddress('');
      setNewCrewId('');
      setDate('');
      setRequiredSkills('');
      setZone('');
      setLat('');
      setLng('');
      setClientId('');
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Unable to create job');
    }
  };

  const handleAssign = async (jobId) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/jobs/${jobId}/assign`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Unable to assign job');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await updateJobStatus(jobId, newStatus);
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Unable to update status');
    }
  };

  const handleCheckIn = async (jobId) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/jobs/${jobId}/check-in`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Unable to check in');
      }
    } catch (err) {
      console.error(err);
      alert('Error checking in');
    }
  };

  const handleCheckOut = async (jobId) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/jobs/${jobId}/check-out`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Unable to check out');
      }
    } catch (err) {
      console.error(err);
      alert('Error checking out');
    }
  };

  const handleOptimize = async () => {
    try {
      const result = await optimizeJobs();
      if (result && result.suggestions) {
        setSuggestions(result.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error(err);
      alert('Unable to optimize schedule');
    }
  };

  const handleViewInvoice = async (jobId) => {
    try {
      const data = await fetchInvoice(jobId);
      if (data.error) {
        alert(data.error);
      } else {
        setInvoice(data);
      }
    } catch (err) {
      console.error(err);
      alert('Unable to fetch invoice');
    }
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-4">Job Scheduler</h2>
      {/* Button to request AI optimisation suggestions for admins and foremen */}
      {role && role !== 'crew' && (
        <div className="mb-4">
          <button
            className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
            onClick={handleOptimize}
          >
            Optimize Schedule (AI)
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-9 gap-4 bg-white p-4 shadow rounded">
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Job description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Required skills (comma‑separated)"
          value={requiredSkills}
          onChange={(e) => setRequiredSkills(e.target.value)}
        />
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        />
        <select
          className="border p-2 rounded"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Select Client (optional)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
        <select
          className="border p-2 rounded"
          value={newCrewId}
          onChange={(e) => setNewCrewId(e.target.value)}
        >
          <option value="">Unassigned</option>
          {crews.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="date"
          className="border p-2 rounded"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className="col-span-full md:col-span-1 bg-primary text-white py-2 px-4 rounded hover:bg-orange-700" type="submit">
          Add Job
        </button>
      </form>
      {/* Display AI suggestions if available */}
      {suggestions && suggestions.length > 0 && (
        <div className="mb-6 bg-white p-4 shadow rounded">
          <h3 className="font-semibold mb-2">AI Assignment Suggestions</h3>
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left text-sm">Job</th>
                <th className="px-2 py-1 text-left text-sm">Suggested Crew</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((sug, index) => {
                const job = jobs.find((j) => j.id === sug.jobId);
                const crew = crews.find((c) => c.id === sug.crewId);
                return (
                  <tr key={index} className="border-b">
                    <td className="px-2 py-1 text-sm">
                      #{sug.jobId} – {job ? job.description : 'Unknown Job'}
                    </td>
                    <td className="px-2 py-1 text-sm">
                      #{sug.crewId} – {crew ? crew.name : 'Unknown Crew'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <table className="min-w-full bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-left">Address</th>
            <th className="px-4 py-2 text-left">Crew</th>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Required Skills</th>
            <th className="px-4 py-2 text-left">Zone</th>
            <th className="px-4 py-2 text-left">Latitude</th>
            <th className="px-4 py-2 text-left">Longitude</th>
            <th className="px-4 py-2 text-left">Client</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id} className="border-b">
              <td className="px-4 py-2">{j.id}</td>
              <td className="px-4 py-2">{j.description}</td>
              <td className="px-4 py-2">{j.address}</td>
              <td className="px-4 py-2">
                {j.crewId ? crews.find((c) => c.id === j.crewId)?.name : 'Unassigned'}
              </td>
              <td className="px-4 py-2">{j.date || ''}</td>
              <td className="px-4 py-2">{j.requiredSkills?.join(', ')}</td>
              <td className="px-4 py-2">{j.zone || ''}</td>
              <td className="px-4 py-2">{typeof j.lat === 'number' ? j.lat : ''}</td>
              <td className="px-4 py-2">{typeof j.lng === 'number' ? j.lng : ''}</td>
              <td className="px-4 py-2">
                {j.clientId ? clients.find((c) => c.id === j.clientId)?.name : ''}
              </td>
              <td className="px-4 py-2">
                {j.status || 'Scheduled'}
              </td>
              <td className="px-4 py-2 space-y-2 md:space-y-0 md:space-x-2">
                {!j.crewId && (
                  <button
                    className="bg-secondary text-white px-2 py-1 rounded hover:bg-blue-800 text-sm"
                    onClick={() => handleAssign(j.id)}
                  >
                    Auto Assign
                  </button>
                )}
                {/* Status selector for admin/foreman only */}
                {role && role !== 'crew' && (
                  <select
                    className="border p-1 rounded text-sm"
                    value={j.status || 'Scheduled'}
                    onChange={(e) => handleStatusChange(j.id, e.target.value)}
                  >
                    {['Scheduled', 'On-Site', 'Complete', 'Flagged'].map((statusOption) => (
                      <option key={statusOption} value={statusOption}>{statusOption}</option>
                    ))}
                  </select>
                )}
                {/* Check-in/out buttons for crew assigned to this job */}
                {role === 'crew' && userCrewId && j.crewId === userCrewId && (
                  <>
                    {j.status === 'Scheduled' && (
                      <button
                        className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-sm"
                        onClick={() => handleCheckIn(j.id)}
                      >
                        Check In
                      </button>
                    )}
                    {j.status === 'On-Site' && (
                      <button
                        className="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 text-sm"
                        onClick={() => handleCheckOut(j.id)}
                      >
                        Check Out
                      </button>
                    )}
                  </>
                )}
                {/* View invoice for completed jobs */}
                {j.status === 'Complete' && (
                  <button
                    className="bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 text-sm"
                    onClick={() => handleViewInvoice(j.id)}
                  >
                    View Invoice
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Display invoice details if loaded */}
      {invoice && (
        <div className="mt-6 bg-white p-4 shadow rounded">
          <h3 className="font-semibold mb-2">Invoice for Job #{invoice.jobId}</h3>
          <p>Description: {invoice.description}</p>
          <p>Date: {invoice.date || 'N/A'}</p>
          {invoice.client && <p>Client: {invoice.client.name}</p>}
          {invoice.crew && <p>Crew: {invoice.crew.name}</p>}
          <p>Start Time: {invoice.startTime ? new Date(invoice.startTime).toLocaleString() : 'N/A'}</p>
          <p>End Time: {invoice.endTime ? new Date(invoice.endTime).toLocaleString() : 'N/A'}</p>
          <p>Hours: {invoice.hours}</p>
          <p>Rate per Hour: ${invoice.ratePerHour}</p>
          <p className="font-bold">Total: ${invoice.total}</p>
        </div>
      )}
    </Layout>
  );
}