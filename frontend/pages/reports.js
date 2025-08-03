import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { fetchDailySummary } from '@/lib/api';

export default function ReportsPage() {
  // Default to today in YYYY-MM-DD format
  const today = new Date();
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const [date, setDate] = useState(defaultDate);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDailySummary(date);
      if (data.error) {
        setError(data.error);
        setSummary(null);
      } else {
        setSummary(data);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to fetch summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [date]);

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-4">Daily Summary Report</h2>
      <div className="mb-4 flex items-center space-x-4">
        <label htmlFor="report-date" className="font-semibold">Select Date:</label>
        <input
          id="report-date"
          type="date"
          className="border p-2 rounded"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {summary && !loading && (
        <div className="space-y-4">
          <div className="bg-white p-4 shadow rounded">
            <h3 className="font-semibold mb-2">Overview</h3>
            <p>Total Jobs: {summary.totalJobs}</p>
            <div className="mt-2">
              <h4 className="font-semibold">Status Counts:</h4>
              <ul className="list-disc list-inside">
                {Object.keys(summary.statusCounts).map((status) => (
                  <li key={status}>{status}: {summary.statusCounts[status]}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="bg-white p-4 shadow rounded">
            <h3 className="font-semibold mb-2">Crew Summary</h3>
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left text-sm">Crew</th>
                  <th className="px-2 py-1 text-left text-sm">Number of Jobs</th>
                </tr>
              </thead>
              <tbody>
                {summary.crewSummary.map((c) => (
                  <tr key={c.crewId} className="border-b">
                    <td className="px-2 py-1 text-sm">{c.name}</td>
                    <td className="px-2 py-1 text-sm">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}