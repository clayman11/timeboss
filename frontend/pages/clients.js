import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { fetchClients, createClient } from '@/lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const loadClients = async () => {
    const data = await fetchClients();
    setClients(data);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    await createClient({ name, email, phone });
    setName('');
    setEmail('');
    setPhone('');
    loadClients();
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-4">Clients</h2>
      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 shadow rounded">
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Client name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          className="border p-2 rounded"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="tel"
          className="border p-2 rounded"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="col-span-full md:col-span-1 bg-primary text-white py-2 px-4 rounded hover:bg-orange-700" type="submit">
          Add Client
        </button>
      </form>
      <table className="min-w-full bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Phone</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="px-4 py-2">{c.id}</td>
              <td className="px-4 py-2">{c.name}</td>
              <td className="px-4 py-2">{c.email || ''}</td>
              <td className="px-4 py-2">{c.phone || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}