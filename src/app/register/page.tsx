"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { trackEvent } from "@/lib/gtag";

type Step = "form" | "otp";

const RESEND_COOLDOWN_SECONDS = 60;

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not send verification code.");
      return;
    }
    setStep("otp");
    setOtp("");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = otp.trim().replace(/\s/g, "");
    if (!code) {
      setError("Enter the verification code from your email.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: code }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Invalid or expired code.");
      return;
    }
    trackEvent("sign_up");
    await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    });
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not resend code.");
      return;
    }
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setOtp("");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 safe-area-inset-bottom">
      <AppHeader session={null} />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="mb-6 w-40 opacity-90 sm:mb-8 sm:w-48">
          <Image src="/images/auth-welcome.svg" alt="" width={280} height={180} className="w-full h-auto" />
        </div>
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Create account</h1>
          <p className="mt-1 text-sm text-gray-600">Start your free trial after signup — no credit card required</p>

          {step === "form" ? (
            <>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign up with Google
                </button>
                <p className="mt-4 text-center text-sm text-gray-500">or</p>
              </div>
            <form onSubmit={handleSendOtp} className="mt-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Password (min 8 characters)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  minLength={8}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 active:bg-emerald-700"
              >
                {loading ? "Sending code…" : "Send verification code"}
              </button>
            </form>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
              <p className="text-sm text-gray-600">
                We sent a code to <strong className="text-gray-900">{email}</strong>. Check your inbox.
              </p>
              <div>
                <label htmlFor="otp" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Verification code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={8}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 active:bg-emerald-700"
              >
                {loading ? "Verifying…" : "Verify and create account"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setStep("form"); setError(""); setOtp(""); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Use a different email
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
              Log in
            </Link>
          </p>
        </div>
        <div className="mt-6 max-w-md sm:mt-8">
          <Disclaimer />
        </div>
      </main>
    </div>
  );
}
