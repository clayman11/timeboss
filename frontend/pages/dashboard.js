import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { fetchCrews, fetchJobs } from '@/lib/api';

export default function Dashboard() {
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

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white shadow p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Crews</h3>
          <p className="text-3xl font-bold text-primary">{crews.length}</p>
        </div>
        <div className="bg-white shadow p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Jobs</h3>
          <p className="text-3xl font-bold text-primary">{jobs.length}</p>
        </div>
      </div>
    </Layout>
  );
}