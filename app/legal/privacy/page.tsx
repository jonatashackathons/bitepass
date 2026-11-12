'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const [erasureStatus, setErasureStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEraseAccountData = async () => {
    setIsDeleting(true);
    setErasureStatus(null);
    try {
      const res = await fetch('/api/v1/account/data', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.deleted) {
        setErasureStatus(
          `Session cleared & ${data.anonymizedRecords ?? 0} order record(s) anonymized.`
        );
      } else {
        setErasureStatus(data.detail ?? 'Unable to complete erasure request.');
      }
    } catch {
      setErasureStatus('Network error while requesting data erasure.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-culinary-bg text-culinary-text py-8 px-4">
      <main className="max-w-2xl mx-auto bg-white rounded-3xl border border-culinary-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-culinary-border">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-culinary-sage" />
            <h1 className="font-serif text-xl sm:text-2xl font-bold">
              Privacy Policy, Geolocation &amp; Limited Use
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-culinary-bg border border-culinary-border text-xs font-semibold hover:bg-culinary-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Lunch</span>
          </Link>
        </div>

        <section className="space-y-2 text-xs leading-relaxed text-culinary-muted">
          <h2 className="font-serif text-base font-bold text-culinary-text">
            1. Bounded Meal-Window Geolocation (Zero Breadcrumb Sale)
          </h2>
          <p>
            Under GDPR and CCPA/CPRA, precise proximity telemetry is evaluated strictly during an active meal window or in-flight escrow order to trigger the ≤250m kitchen-fire and ≤50m doorstep-settlement geofences. BitePass never stores continuous background location trails and never sells or shares location data with ad networks or data brokers.
          </p>
        </section>

        <section className="space-y-2 text-xs leading-relaxed text-culinary-muted">
          <h2 className="font-serif text-base font-bold text-culinary-text">
            2. Google API Services &quot;Limited Use&quot; Calendar Disclosure
          </h2>
          <p>
            BitePass&apos;s use and transfer of information received from Google APIs adheres strictly to the Google API Services User Data Policy, including the Limited Use requirements. BitePass ingests only anonymized free/busy duration intervals (<code>calendar.freebusy</code>) — never meeting titles, descriptions, or attendee lists — and never uses calendar metadata to train foundation models.
          </p>
        </section>

        <section className="space-y-2 text-xs leading-relaxed text-culinary-muted">
          <h2 className="font-serif text-base font-bold text-culinary-text">
            3. Self-Serve Right to Erasure (GDPR Art. 17 / CCPA)
          </h2>
          <p>
            You may erase your active session, void any uncaptured escrow authorization, and anonymize your diner identifier across order records at any time:
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleEraseAccountData}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isDeleting ? 'Erasing Data...' : 'Delete My Session & Order PII'}
              </span>
            </button>
            {erasureStatus && (
              <span
                role="status"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800"
              >
                <CheckCircle2 className="w-4 h-4 text-culinary-sage" />
                <span>{erasureStatus}</span>
              </span>
            )}
          </div>
        </section>

        <footer className="pt-4 border-t border-culinary-border flex items-center justify-between text-xs text-culinary-muted">
          <span>PCI-DSS SAQ-A &middot; PayPal Vault Tokenized</span>
          <Link href="/legal/terms" className="text-paypal-blue font-semibold hover:underline">
            Terms &amp; Reg E Escrow &rarr;
          </Link>
        </footer>
      </main>
    </div>
  );
}

