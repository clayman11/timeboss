import Layout from '@/components/Layout';

export default function BillingCancel() {
  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-4">Subscription Cancelled</h2>
      <p>You cancelled the checkout process.  You can choose a plan again at any time.</p>
    </Layout>
  );
}