import { useState } from 'react';
import Layout from '@/components/Layout';
import { createCheckoutSession } from '@/lib/api';

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const plans = [
    { id: 'starter', name: 'Starter', price: '$49/mo', description: '3 crew, core scheduling, mobile portal, email support' },
    { id: 'pro', name: 'Pro', price: '$99/mo', description: '10 crew, AI auto‑scheduling, CRM, route optimisation' },
    { id: 'premium', name: 'Premium', price: '$149/mo', description: 'Unlimited crew, advanced reporting, SMS, AI assistant' },
  ];

  const handleSubscribe = async (planId) => {
    setLoading(true);
    try {
      const result = await createCheckoutSession(planId);
      if (result && result.url) {
        window.location.href = result.url;
      } else {
        alert('Unable to create checkout session');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating checkout session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-4">Billing & Subscription</h2>
      <p className="mb-4">Choose the plan that fits your team and start your subscription.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="border p-4 rounded shadow bg-white flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <p className="text-2xl font-bold mb-2">{plan.price}</p>
              <p className="text-sm text-gray-700 mb-4">{plan.description}</p>
            </div>
            <button
              className="bg-primary text-white py-2 px-4 rounded hover:bg-orange-700 disabled:opacity-50"
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}