import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt="JD SHARK Logo"
              width={32}
              height={32}
              className="h-6 w-6 sm:h-8 sm:w-8 object-contain"
            />
            <span className="font-bold text-lg sm:text-xl text-primary">JD SHARK</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="sm"
                className="hover:border-accent hover:text-accent transition-colors bg-transparent text-sm sm:text-base"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-sm sm:text-base">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                  Grow Your <span className="text-secondary">Wealth</span> with JD SHARK
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
                  Invest smart, save consistently, and earn through our multi-level referral system. Build your
                  financial future with JD SHARK's comprehensive savings and investment platform.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/auth/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-base sm:text-lg">
                    Start Investing Now
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-base sm:text-lg bg-transparent hover:border-accent hover:text-accent"
                >
                  Learn More
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-4">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-secondary">50K+</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Active Users</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-accent">₦2.5B+</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Saved</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">100%</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">ROI</p>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-accent/20 rounded-2xl blur-3xl"></div>
                <div className="relative bg-card rounded-2xl border border-border p-6 lg:p-8 space-y-6 hover:border-accent/50 transition-colors">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Your Wallet Balance</p>
                    <p className="text-3xl lg:text-4xl font-bold text-secondary">₦125,450.00</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Active Investments</span>
                      <span className="font-semibold text-foreground">3</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Referral Earnings</span>
                      <span className="font-semibold text-accent">₦12,500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Returns</span>
                      <span className="font-semibold text-secondary">₦45,230</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">Why Choose JD SHARK?</h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
              Everything you need to grow your wealth
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: "💰",
                title: "Smart Savings",
                desc: "Create multiple savings plans tailored to your financial goals.",
              },
              {
                icon: "📈",
                title: "100% ROI",
                desc: "Guaranteed returns on your investments over time.",
              },
              {
                icon: "💳",
                title: "Secure Wallet",
                desc: "Fund via Paystack and withdraw to your bank account.",
              },
              {
                icon: "📊",
                title: "Portfolio Management",
                desc: "Organize savings and investments into custom portfolios.",
              },
              {
                icon: "👥",
                title: "5-Level MLM",
                desc: "Earn commissions from your referrals up to 5 generations.",
              },
              {
                icon: "⚡",
                title: "Auto-Reinvest",
                desc: "Enable automatic reinvestment to maximize growth.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-card rounded-xl border border-border p-6 lg:p-8 hover:border-accent/50 hover:shadow-lg transition-all"
              >
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">What Our Users Say</h2>
            <p className="text-xl text-muted-foreground">Join thousands of satisfied investors</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Chioma Okafor",
                role: "Teacher",
                text: "JD SHARK helped me save ₦500k in my first year and earn ₦100k in referral commissions!",
                delay: "0s",
              },
              {
                name: "Ahmed Hassan",
                role: "Entrepreneur",
                text: "The platform is so easy to use. I've already created 3 portfolios for different goals.",
                delay: "0.1s",
              },
              {
                name: "Victoria Okonkwo",
                role: "Healthcare Professional",
                text: "Best investment decision I made. The guaranteed 100% ROI is incredible.",
                delay: "0.2s",
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-background rounded-xl border border-border p-6 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: testimonial.delay }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-secondary hover:scale-110 transition-transform"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-foreground mb-4">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground animate-fade-in">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">Ready to Start Your Journey?</h2>
            <p className="text-xl opacity-90">Join JD SHARK today and start building your wealth</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="w-full sm:w-auto text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/50"
              >
                Create Free Account
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-lg border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 bg-transparent transition-all duration-300"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Image src="/logo.png" alt="JD SHARK Logo" width={32} height={32} className="h-8 w-8 object-contain" />
                <span className="font-bold text-primary">JD SHARK</span>
              </div>
              <p className="text-sm text-muted-foreground">Grow your wealth with confidence</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">Product</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">Company</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">Legal</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 sm:pt-8 text-center text-xs sm:text-sm text-muted-foreground">
            <p>&copy; 2025 JD SHARK. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
