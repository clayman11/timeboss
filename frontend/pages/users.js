import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { fetchUsers, createUser, updateUserRole, fetchCrews } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('crew');
  const [error, setError] = useState('');
  const [crews, setCrews] = useState([]);
  const [crewId, setCrewId] = useState('');
  // Track crew assignments per user for editing existing users
  const [crewAssignments, setCrewAssignments] = useState({});

  const load = async () => {
    const [usersData, crewsData] = await Promise.all([fetchUsers(), fetchCrews()]);
    setUsers(usersData);
    setCrews(crewsData);
    // Initialise crew assignments state based on returned users
    const assignments = {};
    usersData.forEach((u) => {
      if (u.role === 'crew' && u.crewId) {
        assignments[u.id] = u.crewId;
      }
    });
    setCrewAssignments(assignments);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    // If creating a crew user, include crewId if selected
    const payload = { username, password, role };
    if (role === 'crew' && crewId) {
      payload.crewId = parseInt(crewId, 10);
    }
    const res = await createUser(payload);
    if (res.error) {
      setError(res.error);
    } else {
      setUsername('');
      setPassword('');
      setRole('crew');
      setCrewId('');
      setError('');
      load();
    }
  };

  const handleRoleChange = async (id, newRole) => {
    // When changing to crew role, preserve the current crew assignment or default to empty
    const currentCrew = crewAssignments[id] || '';
    const res = await updateUserRole(id, newRole, newRole === 'crew' ? (currentCrew || null) : null);
    if (!res.error) {
      // Update local assignments and reload
      setCrewAssignments((prev) => {
        const updated = { ...prev };
        if (newRole === 'crew') {
          updated[id] = currentCrew || null;
        } else {
          delete updated[id];
        }
        return updated;
      });
      load();
    }
  };

  const handleCrewAssignmentChange = async (id, newCrewId) => {
    // Update the crew assignment for a crew user
    setCrewAssignments((prev) => ({ ...prev, [id]: parseInt(newCrewId, 10) }));
    const user = users.find((u) => u.id === id);
    if (user) {
      const res = await updateUserRole(id, user.role, parseInt(newCrewId, 10));
      if (!res.error) {
        load();
      }
    }
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={handleCreate} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 shadow rounded">
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="border p-2 rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select className="border p-2 rounded" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">admin</option>
          <option value="foreman">foreman</option>
          <option value="crew">crew</option>
        </select>
        {/* When creating a crew user, allow selecting a crew */}
        {role === 'crew' && (
          <select className="border p-2 rounded" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
            <option value="">Select Crew</option>
            {crews.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <button className="col-span-full md:col-span-1 bg-primary text-white py-2 px-4 rounded hover:bg-orange-700" type="submit">
          Create User
        </button>
      </form>
      <table className="min-w-full bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Username</th>
            <th className="px-4 py-2 text-left">Role</th>
            <th className="px-4 py-2 text-left">Change Role</th>
            <th className="px-4 py-2 text-left">Crew</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="px-4 py-2">{u.id}</td>
              <td className="px-4 py-2">{u.username}</td>
              <td className="px-4 py-2">{u.role}</td>
              <td className="px-4 py-2">
                <select
                  className="border p-1 rounded"
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                >
                  <option value="admin">admin</option>
                  <option value="foreman">foreman</option>
                  <option value="crew">crew</option>
                </select>
              </td>
              <td className="px-4 py-2">
                {u.role === 'crew' ? (
                  <select
                    className="border p-1 rounded"
                    value={crewAssignments[u.id] || ''}
                    onChange={(e) => handleCrewAssignmentChange(u.id, e.target.value)}
                  >
                    <option value="">Select Crew</option>
                    {crews.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  ''
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}