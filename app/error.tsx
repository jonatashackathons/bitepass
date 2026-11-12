'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[BitePass Client Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-culinary-bg flex items-center justify-center p-4 text-culinary-text">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-culinary-border shadow-culinary text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 text-culinary-amber">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-lg font-bold mb-1">
          Kitchen Link Interrupted
        </h2>
        <p className="text-xs text-culinary-muted leading-relaxed mb-4">
          Any active PayPal authorization remains safely protected by 2-phase escrow and has not been double-charged.
        </p>
        <button
          onClick={reset}
          className="w-full py-2.5 px-4 rounded-xl bg-paypal-blue hover:bg-paypal-hover text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reconnect to BitePass</span>
        </button>
      </div>
    </div>
  );
}

