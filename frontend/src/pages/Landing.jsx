import { Button } from "@/components/ui/button";
import { ArrowRight, FileSearch, LineChart, BellRing, Sparkles } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function login() {
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

const FEATURES = [
  {
    icon: FileSearch,
    title: "Extract contract intelligence",
    body: "Upload any PDF contract, invoice, or SaaS agreement. Claude parses out renewal dates, prices, notice periods and auto-renew clauses.",
  },
  {
    icon: LineChart,
    title: "Market-price benchmarks",
    body: "See what the market is currently paying for the same tool. Spot overspend and negotiate with data on your side.",
  },
  {
    icon: BellRing,
    title: "Renewal radar",
    body: "A single timeline of every upcoming renewal. Never get auto-charged before you had time to decide.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 relative overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2" data-testid="landing-brand">
            <div className="h-8 w-8 bg-black text-white rounded-md flex items-center justify-center font-display font-bold">C</div>
            <span className="font-display font-bold text-lg tracking-tight">ContractPilot</span>
          </div>
          <Button onClick={login} className="rounded-md" data-testid="landing-signin-btn">
            Sign in with Google <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 dot-grid opacity-70 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-20 relative">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 border border-black/15 rounded-full px-3 py-1 text-xs bg-white">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="label-eyebrow text-neutral-700">AI-native contract control</span>
              </div>
              <h1 className="mt-6 font-display font-bold text-5xl md:text-7xl leading-[0.95] tracking-tight">
                Every subscription.
                <br />
                <span className="font-serif-display italic font-light text-neutral-500">One dashboard.</span>
              </h1>
              <p className="mt-6 text-lg text-neutral-600 max-w-2xl leading-relaxed">
                ContractPilot reads your service contracts, invoices and accounting exports — then benchmarks each
                subscription against the current market. AI licenses, internet, comms, SaaS: nothing renews behind your back.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <Button onClick={login} size="lg" className="rounded-md h-11 px-6" data-testid="hero-cta-btn">
                  Start free with Google <ArrowRight className="h-4 w-4" />
                </Button>
                <a href="#features" className="text-sm text-neutral-600 hover:text-black underline underline-offset-4">
                  See how it works
                </a>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="relative bg-white border border-black/10 rounded-lg p-6 shadow-sm">
                <div className="label-eyebrow text-neutral-500 mb-3">Live sample · June</div>
                <div className="space-y-4">
                  <SampleRow name="OpenAI Team" cat="AI" current="$60.00" market="$50.00" over />
                  <SampleRow name="Slack Business+" cat="Comms" current="$15.00" market="$15.00" />
                  <SampleRow name="AWS Business" cat="Cloud" current="$220.00" market="$180.00" over />
                  <SampleRow name="Zoom Pro" cat="Comms" current="$16.99" market="$14.99" over />
                </div>
                <div className="mt-5 pt-4 border-t border-black/10 flex items-baseline justify-between">
                  <span className="text-xs text-neutral-500">Potential savings / mo</span>
                  <span className="font-mono font-semibold text-emerald-600">$70.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-black/10 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="grid md:grid-cols-3 gap-0">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className={`p-8 ${i < FEATURES.length - 1 ? "md:border-r" : ""} border-black/10`}>
                  <Icon className="h-6 w-6 mb-6" strokeWidth={1.75} />
                  <h3 className="font-display font-semibold text-xl tracking-tight mb-2">{f.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 text-xs text-neutral-500 flex justify-between">
          <span>© {new Date().getFullYear()} ContractPilot</span>
          <span className="label-eyebrow">Built with Claude Sonnet 4.5</span>
        </div>
      </footer>
    </div>
  );
}

function SampleRow({ name, cat, current, market, over }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-neutral-500 label-eyebrow">{cat}</div>
      </div>
      <div className="text-right">
        <div className="font-mono">{current}</div>
        <div className={`text-xs font-mono ${over ? "text-rose-500" : "text-neutral-500"}`}>mkt {market}</div>
      </div>
    </div>
  );
}
