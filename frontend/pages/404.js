import Link from 'next/link';
import Layout from '@/components/Layout';

// Custom 404 page for unknown routes.  Displays a friendly message and a link back to the home page.
export default function NotFoundPage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center mt-16">
        <h1 className="text-4xl font-bold mb-4">404 – Page Not Found</h1>
        <p className="mb-4">The page you are looking for does not exist.</p>
        <Link href="/">
          <span className="text-primary underline">Return home</span>
        </Link>
      </div>
    </Layout>
  );
}