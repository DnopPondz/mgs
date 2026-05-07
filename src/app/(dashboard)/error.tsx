"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw, ShieldCheck } from "lucide-react";

function isMongoConnectionError(error: Error & { digest?: string }) {
  const message = (error?.message || "").toLowerCase();
  const name = (error?.name || "").toLowerCase();

  return (
    name.includes("mongoconnectionerror") ||
    message.includes("mongodb atlas") ||
    message.includes("mongodb_uri") ||
    message.includes("server selection timed out") ||
    message.includes("authentication failed") ||
    message.includes("bad auth")
  );
}

export default function DashboardErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDbError = isMongoConnectionError(error);

  return (
    <div className="flex min-h-[65vh] items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-[var(--surface)] p-6 dark:border-gray-800 md:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isDbError ? "Database Connection Required" : "Something Went Wrong"}
          </h2>
        </div>

        {isDbError ? (
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              The app cannot reach MongoDB Atlas right now. This is usually caused by IP allowlist
              or credential configuration.
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
              <p className="mb-2 font-medium text-gray-900 dark:text-gray-100">Quick checklist</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Add your current public IP in Atlas Network Access.</li>
                <li>Verify `MONGODB_URI` in `.env.local` (username, password, database).</li>
                <li>Restart the dev server after saving `.env.local`.</li>
              </ol>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            An unexpected error occurred while loading this page.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>

          <Link
            href="https://cloud.mongodb.com/v2#/security/network/accessList"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ShieldCheck className="h-4 w-4" />
            Atlas Network Access
          </Link>
        </div>
      </div>
    </div>
  );
}

