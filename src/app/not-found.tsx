import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900">
        <Logo size={32} />
        <span className="whitespace-nowrap">{"ChartAnalytic".slice(0, 5)}<span className="text-emerald-500 m-0 p-0">{"ChartAnalytic"[5]}</span>{"ChartAnalytic".slice(6)}</span>
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-600">The page you’re looking for doesn’t exist or has been moved.</p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
      >
        Back to home
      </Link>
    </div>
  );
}
