import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service & Reg E Escrow Disclosure — BitePass',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-culinary-bg text-culinary-text py-8 px-4">
      <main className="max-w-2xl mx-auto bg-white rounded-3xl border border-culinary-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-culinary-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-paypal-blue" />
            <h1 className="font-serif text-xl sm:text-2xl font-bold">
              Terms of Service &amp; Escrow Authorization
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
            1. Reg E / EFTA Pre-Authorized 2-Phase PayPal Escrow
          </h2>
          <p>
            When you tap <strong className="text-culinary-text">Hold with PayPal</strong>, you authorize a Phase 1 PayPal Orders v2 escrow hold (<code>intent: &quot;AUTHORIZE&quot;</code>) for the displayed all-in total (dish + side selection + municipal meal tax + optional gratuity). No funds are captured at Phase 1.
          </p>
          <p>
            You affirmatively authorize BitePass and the participating merchant of record to automatically execute Phase 2 settlement (<code>CAPTURE</code>) for the exact authorized amount (never more) upon verified arrival within <strong>50 meters</strong> of the merchant pickup counter, cubby QR scan, or manual check-in confirmation.
          </p>
        </section>

        <section className="space-y-2 text-xs leading-relaxed text-culinary-muted">
          <h2 className="font-serif text-base font-bold text-culinary-text">
            2. 90-Second Free Grace Hold &amp; $5.00 Perishable Spoilage Shield
          </h2>
          <p>
            <strong className="text-culinary-text">$0.00 Pre-Fire Cancellation:</strong> Orders remain in a pre-prep grace hold for 90 seconds (while outside the 250m outer kitchen-fire perimeter). Canceling during this window voids the PayPal hold for <strong>$0.00</strong> and releases your pickup station immediately. If a merchant delays your ticket by +5 minutes, a fresh 60-second free cancellation window automatically re-opens.
          </p>
          <p>
            <strong className="text-culinary-text">Post-Fire Cancellation ($5.00 COGS Cap):</strong> Once kitchen assembly has fired (past 90 seconds or inside ≤250m), canceling executes a single final partial capture of <strong>$5.00</strong> to cover prepared perishable ingredients and immediately releases the remaining hold balance back to your PayPal account.
          </p>
        </section>

        <section className="space-y-2 text-xs leading-relaxed text-culinary-muted">
          <h2 className="font-serif text-base font-bold text-culinary-text">
            3. 3-Hour Automatic Hold Expiry &amp; Instant Cubby Dispute Guarantee
          </h2>
          <p>
            Any uncaptured authorization automatically expires and voids within 3 hours. If your assigned bay or heated cubby is empty, inaccurate, or raises an allergen concern upon arrival, use the 2-tap issue control on your Doorstep Pass for a synchronous full PayPal refund and automatic station quarantine.
          </p>
        </section>

        <footer className="pt-4 border-t border-culinary-border flex items-center justify-between text-xs text-culinary-muted">
          <span>Proprietary Commercial Terms &middot; BitePass</span>
          <Link href="/legal/privacy" className="text-paypal-blue font-semibold hover:underline">
            Privacy &amp; Data Erasure &rarr;
          </Link>
        </footer>
      </main>
    </div>
  );
}

