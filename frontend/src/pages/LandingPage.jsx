import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardEdit,
  FileText,
  Globe,
  MapPin,
  Navigation,
  Shield,
  Share2,
  Star,
  Truck,
  User,
  UserCog,
  Video
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, roleHome } from "../utils/helpers";

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD-PtSvT2g9IZwLnN_PKPkoAo1HIWoase3vkYDZZGwouK-l2S1hu7RPs__gfEY0MpbJPsac9i1smuEi2_Wc2Pu_B74WpiwnSGCbKnjXd5syzbcESK9mhfo6810W18L_UJWOnUL68mGj8bzl4hNAPWiTRr9gTZK9C3Hfukrm7nQucgn--mW2LBPrYh9_EkC2EpRpL2G9ba6EurGqbDWpSGYfu0KfQHe2CwKkvPqsO1YbSgeM3lPBLA7jSZQctcWKh95UBlz_-omM_c8";
const AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC77B6eY93wbbmNYtn9GWLcwb02QYua2jxm-nexWh2HUes8kHlSRspl7rhnK6m-tg1V0yy6f_t7VJt1fQl3EqsLdjVzs33hOYahB5DVu1cvhxIkCJ1Xo7QuupxRaOvMRh3ZNrKlWsEYkgYiZhMyeqxnrpYFMmNhpMskL05feXSVmeE2B9nvp2Tl5FstCcEzN14RniK568MqZSFFjjb34k5ZIaHl0SR7Kv8KV0vqYPzYV3MHGEyaGqsmK6zWYg8q2HNz9TipvsrtkRE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA3HA9XQzJ_yZllijQOa-Ek2xig9lietI-DnFW6yMC9Cpxi6IPjV4ncf_GILLwW27bw0awvxqn95rrp6y1xW-H1c1HC7EeXF_Lyr5_LTCLYISM3uQueSLT-bOSDMN8o2zyFG-DQcLIDy-DDZfektJP7oWOQbSqRVUt2N9wL01QHohqJcqlrSkSOb7kda1ZhPjF1xM_c1vP21ycujAa84KsmaP-8REtja6s1s8Lezvn-Vkp2q6l_nM2NIZGTomTku8Hhzhdbdl58XtE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCiheeQ4vnfX2DZ_2hRSMDXb7Xu8tqPX208ff-P76Nvu9EKKUQ0IWRZF-rOYA09zTo3HnnpbQYxcPVfVVhWX6KN6KFcUZRcUoCxk0sTJEk7qrGbSOy8JuHYfxDyxwmvxuKwfm9PtI0ZB223_6q8xM0K_D04CQTTYC8os3WJsiTYq_6FpJGsfOV75Q04M25f-jzewqVCmVh3d3-cLxYXidHavgNg1zfe_KIoXS4lRkY3bKQqOLW-y-k05xX6EmGexD3J9zSTWq9vaWs"
];

export function LandingPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  async function quick(email) {
    try {
      const result = await login({ email, password: DEMO_PASSWORD });
      if (result.verificationRequired) {
        navigate("/login", {
          state: { email, password: DEMO_PASSWORD, step: "verify" }
        });
        return;
      }
      navigate(roleHome(result.user.role));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="bg-background text-on-surface selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      <header className="glass-effect fixed inset-x-0 top-0 z-50 h-20 px-6 md:px-12">
        <nav className="mx-auto flex h-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-secondary-container p-2 text-white">
              <Truck size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">TruckDispatch</span>
          </div>
          <div className="hidden items-center gap-8 lg:flex">
            <a className="text-sm font-semibold text-on-surface-variant hover:text-secondary" href="#features">Features</a>
            <a className="text-sm font-semibold text-on-surface-variant hover:text-secondary" href="#process">How it Works</a>
            <a className="text-sm font-semibold text-on-surface-variant hover:text-secondary" href="#testimonials">Clients</a>
            <div className="h-6 w-px bg-outline-variant" />
            <ThemeToggle />
            <div className="h-6 w-px bg-outline-variant" />
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate(roleHome(user.role))}
                className="rounded-lg bg-secondary-container px-6 py-2.5 text-sm font-semibold text-on-secondary shadow-md"
              >
                Open Dashboard
              </button>
            ) : (
              <>
                <Link className="text-sm font-semibold text-primary hover:text-secondary-container" to="/login">Log In</Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-secondary-container px-6 py-2.5 text-sm font-semibold text-on-secondary shadow-md transition hover:shadow-lg active:scale-95"
                >
                  Book a Truck
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Link to="/login" className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold">Log In</Link>
          </div>
        </nav>
      </header>

      <main className="pt-20">
        <section className="hero-gradient relative flex min-h-[870px] items-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute right-[-10%] top-20 h-[600px] w-[600px] rounded-full bg-secondary-container blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-tertiary-fixed-dim blur-[100px]" />
          </div>
          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-6 py-20 lg:grid-cols-2 lg:px-6">
            <div className="space-y-4 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-on-primary-fixed-variant/20 px-4 py-1.5 backdrop-blur-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-container" />
                <span className="text-xs font-medium uppercase tracking-widest text-secondary-fixed">Next-Gen Logistics Platform</span>
              </div>
              <h1 className="text-5xl font-extrabold leading-[1.1] md:text-6xl">
                Smart Truck Dispatching
                <br />
                <span className="text-secondary-fixed-dim">Simplified for You</span>
              </h1>
              <p className="max-w-lg text-lg text-on-primary-container">
                Connect with trusted truck owners and drivers for fast, reliable, and affordable deliveries. Real-time monitoring and advanced fleet management at your fingertips.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/register"
                  className="group flex items-center gap-2 rounded-xl bg-secondary-container px-8 py-4 text-sm font-semibold text-on-secondary transition hover:shadow-xl"
                >
                  Book a Truck <ArrowRight className="transition group-hover:translate-x-1" size={18} />
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20"
                >
                  Explore Platform
                </Link>
              </div>
              <div className="flex items-center gap-8 border-t border-white/10 pt-12">
                <div className="flex -space-x-3">
                  {AVATARS.map((src) => (
                    <img key={src} src={src} alt="" className="h-10 w-10 rounded-full border-2 border-[#0d1c32] object-cover" />
                  ))}
                </div>
                <p className="text-xs text-on-primary-container">
                  Trusted by <span className="font-bold text-white">10,000+</span> logistics professionals worldwide
                </p>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="group relative z-10 overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
                <img
                  src={HERO_IMG}
                  alt="Truck on highway"
                  className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="glass-effect absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container/20 text-secondary-container">
                      <MapPin />
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Live Tracking</p>
                      <p className="text-sm font-semibold text-primary">I-80, Ohio, USA</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-on-surface-variant">ETA</p>
                    <p className="text-sm font-semibold text-secondary">45 min</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary py-12">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 lg:grid-cols-4">
            {[
              ["25K+", "Deliveries Completed"],
              ["10K+", "Happy Customers"],
              ["5K+", "Trucks on Road"],
              ["99%", "On-Time Delivery"]
            ].map(([value, label]) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-semibold text-white md:text-[24px]">{value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-widest text-on-primary-container">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 space-y-4 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">Platform Excellence</p>
              <h2 className="text-[32px] font-bold tracking-tight text-primary">Why Choose TruckDispatch?</h2>
              <p className="mx-auto max-w-2xl text-on-surface-variant">
                We provide the most robust infrastructure for modern logistics, built for precision and speed.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <article className="bento-card flex flex-col justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 md:col-span-1">
                <div>
                  <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-fixed text-secondary">
                    <Shield size={28} />
                  </div>
                  <h3 className="mb-4 text-xl font-semibold text-primary">Reliable & Safe</h3>
                  <p className="text-on-surface-variant">Every truck and driver on our platform undergoes a rigorous 5-step verification process to ensure safety.</p>
                </div>
              </article>
              <article className="bento-card relative min-h-[300px] overflow-hidden rounded-3xl bg-primary-container p-6 text-white md:col-span-2">
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div>
                    <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                      <Navigation size={28} />
                    </div>
                    <h3 className="mb-4 text-xl font-semibold">Real-time Tracking</h3>
                    <p className="max-w-md text-on-primary-container">GPS integration across all fleet vehicles provides sub-meter accuracy for real-time shipment monitoring and predictive ETA.</p>
                  </div>
                  <div className="mt-8 flex gap-2">
                    <div className="h-1.5 w-12 rounded-full bg-secondary-container" />
                    <div className="h-1.5 w-6 rounded-full bg-white/20" />
                    <div className="h-1.5 w-6 rounded-full bg-white/20" />
                  </div>
                </div>
                <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-secondary-container/20 to-transparent opacity-30" />
              </article>
              <article className="bento-card flex min-h-[300px] items-center gap-8 rounded-3xl border border-outline-variant/30 bg-surface-container-low p-6 md:col-span-2">
                <div className="flex-1">
                  <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-on-tertiary-container/10 text-on-tertiary-container">
                    <BookOpen size={28} />
                  </div>
                  <h3 className="mb-4 text-xl font-semibold text-primary">Easy Booking</h3>
                  <p className="max-w-sm text-on-surface-variant">Book a truck in just a few taps. Our intelligent dispatch engine matches you with the best nearby available driver instantly.</p>
                </div>
                <div className="hidden w-1/3 rotate-3 aspect-square rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-inner sm:block">
                  <div className="flex h-full w-full flex-col gap-2 rounded-lg bg-surface-container-high p-2">
                    <div className="h-4 w-3/4 rounded bg-outline-variant/20" />
                    <div className="h-4 w-1/2 rounded bg-outline-variant/20" />
                    <div className="mt-auto h-8 w-full rounded bg-secondary-container/10" />
                  </div>
                </div>
              </article>
              <article className="bento-card flex flex-col justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 md:col-span-1">
                <div>
                  <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                    <FileText size={28} />
                  </div>
                  <h3 className="mb-4 text-xl font-semibold text-primary">Secure Payments</h3>
                  <p className="text-on-surface-variant">Multi-layer encryption and escrow-based payment releases ensure every transaction is protected and transparent.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="process" className="bg-surface-container-lowest py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-20 text-center">
              <h2 className="text-[32px] font-bold text-primary">How It Works</h2>
              <p className="mt-4 text-on-surface-variant">Streamlining logistics in four simple steps</p>
            </div>
            <div className="relative">
              <div className="absolute left-0 top-12 hidden h-[2px] w-full border-t border-dashed border-outline-variant lg:block" />
              <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                {[
                  [ClipboardEdit, "1. Book a Truck", "Select your pickup and delivery locations."],
                  [User, "2. We Assign", "We find the best truck for your shipment."],
                  [Navigation, "3. Track in Real-time", "Track your shipment live on the map."],
                  [Shield, "4. Delivered", "Your shipment is delivered safely."]
                ].map(([Icon, title, text]) => (
                  <div key={title} className="group text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-surface-container-lowest shadow-md transition duration-300 group-hover:border-secondary-container">
                      <Icon className="text-primary" size={36} />
                    </div>
                    <h4 className="mb-2 text-xl font-semibold">{title}</h4>
                    <p className="text-sm text-on-surface-variant">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="overflow-hidden py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 flex flex-col items-end justify-between gap-4 lg:flex-row">
              <div className="max-w-xl">
                <h2 className="text-[32px] font-bold text-primary">What Our Customers Say</h2>
                <p className="mt-4 text-on-surface-variant">
                  Join thousands of satisfied business owners who have transformed their supply chain with TruckDispatch.
                </p>
              </div>
              <div className="flex gap-4">
                <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant hover:bg-secondary-container hover:text-white"><ChevronLeft /></button>
                <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant hover:bg-secondary-container hover:text-white"><ChevronRight /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                ["Great service! My goods were delivered on time and in perfect condition. The driver was professional.", "Sarah Johnson", "CEO, Retail Solutions", AVATARS[0]],
                ["TruckDispatch made logistics so easy and transparent. Real-time tracking is very accurate and helpful for our operations.", "Michael Brown", "Operations Manager, FabLink", AVATARS[1]],
                ["Excellent support and the platform is very intuitive. Our fleet efficiency has increased by 40% since we joined.", "Priya Sharma", "Director, Global Supply", AVATARS[2]]
              ].map(([quote, name, role, img]) => (
                <article key={name} className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
                  <div className="mb-4 flex gap-1 text-secondary-container">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={18} fill="currentColor" />)}
                  </div>
                  <p className="mb-8 text-lg italic text-primary">"{quote}"</p>
                  <div className="flex items-center gap-4">
                    <img src={img} alt="" className="h-12 w-12 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold text-primary">{name}</p>
                      <p className="text-xs text-on-surface-variant">{role}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-primary-container py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(254,107,0,0.08),transparent)]" />
          <div className="relative z-10 mx-auto max-w-7xl px-6 text-center text-white">
            <h2 className="mb-12 text-[32px] font-bold">Ready to Get Started?</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                [User, "Customer", "Ship your goods anywhere with ease.", "customer@truckdispatch.local", "Register Now →"],
                [Truck, "Driver", "Find jobs and manage trips.", "driver@truckdispatch.local", "Apply Today →"],
                [UserCog, "Dispatcher", "Oversee and optimize logistics.", "dispatcher@truckdispatch.local", "Login →"],
                [Shield, "Admin", "Manage users, trucks, and reports.", "admin@truckdispatch.local", "Login →"]
              ].map(([Icon, title, text, email, cta]) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => quick(email)}
                  className="group rounded-3xl border border-white/10 bg-white/10 p-8 text-left backdrop-blur transition hover:bg-white/20"
                >
                  <Icon className="mb-4 block text-secondary-fixed-dim" size={36} />
                  <h4 className="mb-2 text-xl font-semibold">{title}</h4>
                  <p className="mb-6 text-sm text-on-primary-container">{text}</p>
                  <span className="text-sm font-semibold group-hover:underline">{cta}</span>
                </button>
              ))}
            </div>
            <p className="mt-8 text-sm text-on-primary-container">Demo password: {DEMO_PASSWORD}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-background pb-12 pt-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-6 flex items-center gap-2">
                <div className="rounded-lg bg-secondary-container p-1.5 text-white"><Truck size={18} /></div>
                <span className="text-xl font-semibold text-primary">TruckDispatch</span>
              </div>
              <p className="mb-8 text-sm text-on-surface-variant">A smart logistics platform connecting shippers, drivers and truck owners for seamless deliveries.</p>
              <div className="flex gap-4">
                {[Share2, Globe, Video].map((Icon) => (
                  <span key={Icon.name} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-primary">
                    <Icon size={18} />
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h5 className="mb-6 text-sm font-semibold text-primary">Company</h5>
              <ul className="space-y-4 text-on-surface-variant">
                <li>About Us</li><li>Careers</li><li>Blog</li><li>Contact</li>
              </ul>
            </div>
            <div>
              <h5 className="mb-6 text-sm font-semibold text-primary">Support</h5>
              <ul className="space-y-4 text-on-surface-variant">
                <li>Help Center</li><li>FAQs</li><li>Terms & Conditions</li><li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h5 className="mb-6 text-sm font-semibold text-primary">Subscribe</h5>
              <p className="mb-4 text-sm text-on-surface-variant">Get the latest logistics news and updates.</p>
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm" placeholder="Email address" />
                <button type="button" className="rounded-lg bg-primary px-4 py-2 text-white">Join</button>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant pt-8 md:flex-row">
            <p className="text-sm text-on-surface-variant">© 2024 TruckDispatch. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-on-surface-variant">
              <span>Cookie Settings</span>
              <span>Sitemap</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
