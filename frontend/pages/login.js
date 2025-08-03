import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }
      if (mode === 'login') {
        localStorage.setItem('token', data.token);
        if (data.role) {
          localStorage.setItem('role', data.role);
        }
        if (data.crewId != null) {
          localStorage.setItem('crewId', data.crewId);
        }
        router.push('/');
      } else {
        // signup succeeded; switch to login
        setMode('login');
        setError('User created. Please log in.');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto bg-white p-6 rounded shadow mt-8">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </h2>
        {error && <p className="text-red-600 mb-2 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            className="w-full border p-2 rounded"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="w-full border p-2 rounded"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-orange-700">
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <div className="mt-4 text-center">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button className="text-secondary underline" onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button className="text-secondary underline" onClick={() => { setMode('login'); setError(''); }}>Login</button>
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}