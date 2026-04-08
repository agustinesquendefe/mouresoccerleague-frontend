'use client';

import { useState } from 'react';

export default function ContactForm({ toEmail }: { toEmail: string }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contact form – ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nMessage:\n${form.message}`
    );
    window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--color-blue, #023467)' }}
        >
          <svg className="text-white w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-filson-black text-gray-900 mb-1">¡Listo!</h3>
        <p className="font-filson-regular text-gray-500 text-sm">Tu correo se está abriendo. Envíalo desde tu cliente de email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-filson-bold text-gray-700 mb-1 uppercase tracking-wide">
            Name *
          </label>
          <input
            type="text"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="Your name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-filson-regular focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-filson-bold text-gray-700 mb-1 uppercase tracking-wide">
            Email *
          </label>
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@email.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-filson-regular focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-filson-bold text-gray-700 mb-1 uppercase tracking-wide">
          Phone
        </label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="(xxx) xxx-xxxx"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-filson-regular focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-filson-bold text-gray-700 mb-1 uppercase tracking-wide">
          Message *
        </label>
        <textarea
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={handleChange}
          placeholder="How can we help you?"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-filson-regular focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
      <button
        type="submit"
        className="w-full py-3 rounded-lg font-filson-black text-sm uppercase tracking-widest text-white transition hover:opacity-90"
        style={{ background: 'var(--color-blue, #023467)' }}
      >
        Send Message
      </button>
    </form>
  );
}
