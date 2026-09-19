'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const INCIDENT_ID = 'incident-2026-09-19'; // bump this per incident

export default function StatusBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(`banner-dismissed-${INCIDENT_ID}`) === 'true');
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="status"
      className="w-full bg-amber-100 text-amber-900 text-sm py-2 px-4 border-b border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 flex items-center justify-center gap-3"
    >
      <span>
        The recent service disruption has been resolved. Go to{' '}
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
        onClick={() => {
          localStorage.setItem(`banner-dismissed-${INCIDENT_ID}`, 'true');
          setDismissed(true);
        }}
        aria-label="Dismiss"
        className="shrink-0 hover:opacity-70"
      >
        <X size={16} />
      </button>
    </div>
  );
}