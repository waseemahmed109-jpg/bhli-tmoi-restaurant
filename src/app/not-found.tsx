import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h2 className="text-3xl font-bold mb-4">Not Found</h2>
      <p className="text-gray-600 mb-6">Could not find requested resource</p>
      <Link href="/dashboard" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Return to Dashboard
      </Link>
    </div>
  );
}
