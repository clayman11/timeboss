import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useState } from 'react';

export default function Layout({ children }) {
  const router = useRouter();

  const [role, setRole] = useState(null);

  // Redirect to login if not authenticated.  Runs only on the client.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token && router.pathname !== '/login') {
        router.push('/login');
      }
      const storedRole = localStorage.getItem('role');
      if (storedRole) {
        setRole(storedRole);
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-steel text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">TimeBoss Prototype</h1>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {/* Always show Home link.  This links to the marketing landing page at `/`. */}
          <Link href="/">
            <span className="hover:underline">Home</span>
          </Link>
          {/* Show dashboard and application navigation only when the user is logged in */}
          {role && (
            <>
              <Link href="/dashboard">
                <span className="hover:underline">Dashboard</span>
              </Link>
              <Link href="/crew">
                <span className="hover:underline">Crew</span>
              </Link>
              <Link href="/jobs">
                <span className="hover:underline">Jobs</span>
              </Link>
              <Link href="/map">
                <span className="hover:underline">Map</span>
              </Link>
              <Link href="/clients">
                <span className="hover:underline">Clients</span>
              </Link>
              <Link href="/billing">
                <span className="hover:underline">Billing</span>
              </Link>
              {/* Admin‑only navigation */}
              {role === 'admin' && (
                <Link href="/users">
                  <span className="hover:underline">Users</span>
                </Link>
              )}
              {/* Admin and foreman can access reports */}
              {(role === 'admin' || role === 'foreman') && (
                <Link href="/reports">
                  <span className="hover:underline">Reports</span>
                </Link>
              )}
            </>
          )}
          {/* If not logged in, provide a Login link */}
          {!role && (
            <Link href="/login">
              <span className="hover:underline">Login</span>
            </Link>
          )}
        </nav>
      </header>
      <main className="flex-grow p-4">
        {children}
      </main>
      <footer className="bg-steel text-white p-4 text-center">
        © {new Date().getFullYear()} TimeBoss Prototype
      </footer>
    </div>
  );
}