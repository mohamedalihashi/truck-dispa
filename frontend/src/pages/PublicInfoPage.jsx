import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Truck } from "lucide-react";
import { PublicSiteHeader } from "../components/PublicSiteHeader";

const PAGES = {
  about: {
    title: "About Us",
    body: [
      "TruckDispatch is a Somalia-focused truck and cargo marketplace that connects fleet managers, dispatchers, and drivers in one workflow.",
      "Book cargo, get quotes, assign trucks, track trips with live GPS, upload proof of delivery, and settle payments with WaafiPay (EVC / ZAAD).",
      "Our design rule is simple: one driver account equals one truck, so assignment and accountability stay clear."
    ]
  },
  contact: {
    title: "Contact",
    body: [
      "Need help with booking, dispatch, or your account?",
      "Email support: support@truckdispatch.local",
      "For account access issues, use Forgot Password on the login page, or ask your admin to reset your user."
    ]
  },
  help: {
    title: "Help Center",
    body: [
      "Fleet Managers: create a cargo request, review dispatcher quotes, track the trip, confirm delivery, then pay.",
      "Dispatchers: quote open requests, assign an available driver and truck, and monitor trip status.",
      "Drivers: accept jobs, update status (arrived → loaded → in transit → delivered), share GPS, and upload POD.",
      "Admins: manage users, fleet, payments, earnings payouts, reports, and audit logs."
    ]
  },
  faqs: {
    title: "FAQs",
    body: [
      "How do I register as a driver? Use Register → Driver and enter truck details (number, plate, capacity, type). One driver = one truck.",
      "How do payments work? After delivery confirmation, customers pay via WaafiPay. Earnings split by platform commission settings (default 80% driver / 10% dispatcher / 10% platform).",
      "Why is OTP skipped sometimes? Admins can set AUTH_OTP_ENABLED=false for local development. Production should keep OTP on.",
      "Where is proof of delivery stored? With Cloudinary when configured; otherwise files are saved on the API server under /uploads."
    ]
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "By using TruckDispatch you agree to provide accurate booking, vehicle, and contact information.",
      "Dispatchers and drivers are responsible for trip updates and delivery proof. Customers are responsible for timely payment after confirmed delivery.",
      "The platform may suspend accounts that abuse quotes, fake GPS, or payment disputes.",
      "These terms are a working product notice and should be reviewed by your legal advisor before public launch."
    ]
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We store account data (name, email, phone, role), cargo and trip records, GPS points during active trips, payment references, and uploaded proof images.",
      "Payment card data is not stored by TruckDispatch; mobile wallet charges go through WaafiPay.",
      "Location history is used for live tracking and dispute support. Access is limited by role permissions.",
      "Contact support to request account correction or deletion subject to legal and operational retention needs."
    ]
  }
};

export function PublicInfoPage() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "");
  const page = PAGES[slug] || PAGES.help;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <PublicSiteHeader variant="auth" />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-[calc(5.5rem+env(safe-area-inset-top))]">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-secondary-container p-2 text-white">
            <Truck size={20} />
          </div>
          <h1 className="text-3xl font-bold text-primary">{page.title}</h1>
        </div>
        <div className="space-y-4 text-base leading-relaxed text-on-surface-variant">
          {page.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/register" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">
            Get started
          </Link>
          <Link to="/login" className="rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-semibold">
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
