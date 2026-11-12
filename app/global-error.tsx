'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-culinary-bg text-culinary-text flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-culinary-border p-6 text-center shadow-xs">
          <h1 className="font-serif text-xl font-bold mb-2">
            BitePass Encountered an Unexpected Error
          </h1>
          <p className="text-xs text-culinary-muted mb-4 leading-relaxed">
            {error.message ||
              'Any uncaptured PayPal escrow holds remain protected by our 3-hour automatic void guarantee.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-paypal-blue hover:bg-paypal-hover text-white text-xs font-bold cursor-pointer"
          >
            Reload Concierge
          </button>
        </div>
      </body>
    </html>
  );
}
