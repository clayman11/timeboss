import Link from 'next/link';
import { useState } from 'react';
import { sendContactMessage } from '@/lib/api';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-grow bg-steel text-white py-20 px-8 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">TimeBoss</h1>
        <p className="text-lg md:text-2xl max-w-2xl mx-auto mb-8">
          The ultimate AI‑powered scheduling and dispatch suite built for landscapers, junk removal crews,
          painters, roofers and all blue‑collar professionals.
        </p>
        <div className="space-x-4">
          <Link href="/login">
            <span className="bg-primary hover:bg-orange-700 text-white py-3 px-6 rounded font-semibold transition-colors">
              Get Started
            </span>
          </Link>
          <a
            href="#pricing"
            className="border border-white hover:bg-white hover:text-steel text-white py-3 px-6 rounded font-semibold transition-colors"
          >
            See Pricing
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-8 bg-gray-100">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { title: 'Crew Management', desc: 'Invite your team, set availability, and tag skills & zones.' },
            { title: 'AI Job Scheduling', desc: 'Smart assignments using proximity, skills and workload.' },
            { title: 'Live Dispatch Map', desc: 'See where crews are and track job statuses in real time.' },
            { title: 'Mobile Portal', desc: 'Crew members see jobs, navigate, upload photos and notes.' },
            { title: 'Client CRM', desc: 'Lightweight customer database with history, notes and VIP tags.' },
            { title: 'Notifications', desc: 'Automated SMS/email alerts for scheduling, reminders and issues.' },
          ].map((feat, idx) => (
            <div key={idx} className="bg-white shadow p-6 rounded text-center">
              <h3 className="text-xl font-semibold mb-2">{feat.title}</h3>
              <p>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-8 bg-white">
        <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { name: 'Starter', price: '$49/mo', features: ['3 crew members', 'Core scheduling', 'Mobile portal', 'Email support'] },
            { name: 'Pro', price: '$99/mo', features: ['10 crew members', 'AI auto‑scheduling', 'CRM & route optimisation'] },
            { name: 'Premium', price: '$149/mo', features: ['Unlimited crew', 'Advanced reporting', 'SMS & AI assistant'] },
          ].map((tier, idx) => (
            <div key={idx} className="border rounded-lg p-6 shadow hover:shadow-md transition">
              <h3 className="text-2xl font-semibold mb-2 text-center">{tier.name}</h3>
              <p className="text-4xl font-bold text-center text-primary mb-4">{tier.price}</p>
              <ul className="mb-6">
                {tier.features.map((f, i) => (
                  <li key={i} className="list-disc list-inside">{f}</li>
                ))}
              </ul>
              <div className="text-center">
                <Link href="/login">
                  <span className="bg-primary hover:bg-orange-700 text-white py-2 px-4 rounded font-semibold transition-colors">Choose Plan</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection />

      {/* Footer */}
      <footer className="bg-steel text-white py-6 text-center">
        <p>© {new Date().getFullYear()} TimeBoss. All rights reserved.</p>
      </footer>
    </div>
  );
}


function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('');
    try {
      const res = await sendContactMessage({ name, email, message });
      if (res.error) {
        setStatus(`Error: ${res.error}`);
      } else {
        setStatus(res.message || 'Thanks for reaching out!');
        setName('');
        setEmail('');
        setMessage('');
      }
    } catch (err) {
      setStatus('Error submitting the form');
      console.error(err);
    }
  }

  return (
    <section id="contact" className="py-16 px-8 bg-gray-100">
      <h2 className="text-3xl font-bold text-center mb-8">Get in Touch</h2>
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white shadow p-6 rounded">
        <div className="mb-4">
          <label htmlFor="name" className="block font-semibold mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="email" className="block font-semibold mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="message" className="block font-semibold mb-1">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="bg-primary hover:bg-orange-700 text-white py-2 px-4 rounded font-semibold transition-colors"
        >
          Submit
        </button>
        {status && <p className="mt-4 text-center">{status}</p>}
      </form>
    </section>
  );
}