import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-culinary-bg flex items-center justify-center p-4 text-culinary-text">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-culinary-border shadow-culinary text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-3 text-culinary-terracotta">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-xl font-bold mb-1">Station Not Found</h1>
        <p className="text-xs text-culinary-muted leading-relaxed mb-4">
          That table or pickup cubby could not be located on the dining strip.
        </p>
        <Link
          href="/"
          className="w-full py-2.5 px-4 rounded-xl bg-culinary-text hover:bg-stone-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Lunch Concierge</span>
        </Link>
      </div>
    </div>
  );
}

