"use client";

import { useState } from "react";

export function SupportForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sub = subject.trim();
    const msg = message.trim();
    if (!sub) {
      setError("Please enter a subject.");
      return;
    }
    if (!msg) {
      setError("Please enter your message.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: sub, message: msg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send message.");
        return;
      }
      setSent(true);
      setSubject("");
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-6 text-center">
        <p className="font-medium text-emerald-800 dark:text-emerald-200">Message sent</p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
          We&apos;ll get back to you at your account email.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm"
    >
      <div>
        <label htmlFor="support-subject" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Subject
        </label>
        <input
          id="support-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Billing question"
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subject.length}/200</p>
      </div>
      <div className="mt-4">
        <label htmlFor="support-message" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Message
        </label>
        <textarea
          id="support-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your question or issue..."
          maxLength={5000}
          rows={6}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{message.length}/5000</p>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="mt-5 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
