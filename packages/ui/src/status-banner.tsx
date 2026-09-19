'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export default function StatusBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="status"
      className="w-full bg-green-100 text-green-900 text-sm py-2 px-4 border-b border-amber-300 dark:bg-green-950 dark:text-green-200 dark:border-green-800 flex items-center justify-center gap-3"
    >
      <span>
        The recent service disruption has been resolved. All systems are operational, see{' '}
        <a
          href="https://status.mcloud.co.ke"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium hover:text-amber-950 dark:hover:text-amber-100"
        >
          status.mcloud.co.ke
        </a>{' '}
        for details.
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 hover:opacity-70"
      >
        <X size={16} />
      </button>
    </div>
  );
}