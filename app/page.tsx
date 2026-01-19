
'use client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles, Zap, Shield, ArrowRight } from "lucide-react"
import { WordRotate } from "@/components/ui/word-rotate"
import Link from "next/link"
import { PlayfulTodolist } from "@/components/animate-ui/components/community/playful-todolist"
import AuthPopup from "@/lib/auth"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import StreamerPackSection from "@/components/upsell"

export default function Home() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Optional: Auto-play functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, []);


  const plans = [
    {
      name: "Blog Pack",
      price: "6,500",
      description: "Perfect for content creators and thought leaders",
      features: [
        "Custom blog design",
        "SEO optimized",
        "Content management system",
        "Mobile responsive",
        "SSL certificate included",
        "Weekly backups",
        "Analytics dashboard",
        "Custom domain"
      ],
      highlight: false,
      cta: "Start writing"
    },
    {
      name: "E-Commerce Pack",
      price: "9,500",
      description: "Built for businesses ready to sell online",
      features: [
        "Full online store setup",
        "Payment gateway integration",
        "Inventory management",
        "Order tracking system",
        "Customer accounts",
        "Mobile-optimized checkout",
        "Sales analytics",
        "Automated email receipts"
      ],
      highlight: true,
      cta: "Start selling"
    },
    {
      name: "Streamer Pack",
      price: "12,500",
      description: "Your own platform. Your rules. Your revenue.",
      features: [
        "Custom streaming platform",
        "Video hosting & delivery",
        "Subscriber management",
        "Monetization tools",
        "Live streaming ready",
        "Content analytics",
        "Mobile & desktop apps",
        "Integration ready"
      ],
      highlight: false,
      cta: "Own your platform"
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Streamer pack upsell with alternating video bg */}
      <StreamerPackSection />

      {/* Hero Section */}
      <section className="container mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20 md:pb-32">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          <div className="w-full md:w-2/3 lg:w-3/4">
            <h1 className="text-display-large font-montserrat mb-6">
              <WordRotate words={["We build it...", "You own it!"]} />
            </h1>

            <p className="text-body-large mb-10">
              Stop wrestling with code, hosting, and updates. Menengai Cloud handles everything while you focus on what matters—your content, your customers, your brand.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="#plans">
                <Button className="google-button-primary px-6 py-2 text-base h-auto cursor-pointer">
                  Choose your plan
                  <ArrowRight />
                </Button>
              </Link>
            </div>
          </div>

          <div className="w-full md:w-1/3 lg:w-1/4">
            <PlayfulTodolist />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-6 md:px-12 py-20 md:py-32">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-display-small mb-4 max-w-3xl font-montserrat">
            Just like magic
          </h2>
          <p className="text-body-large mb-16 max-w-2xl">
            Go from idea to launch in three straightforward steps.
          </p>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Steps List */}
            <div className="space-y-8">
              {[
                {
                  number: "/one.png",
                  title: "Share your vision",
                  description: "Tell us your colors, your style, your goals. We handle the technical details.",
                  image: "/undraw_website-builder_4go7.svg"
                },
                {
                  number: "/two.png",
                  title: "Pick your plan",
                  description: "Choose the pack that fits your vision. Every plan is fully managed.",
                  image: "/undraw_pay-with-credit-card_77g6.svg"
                },
                {
                  number: "/three.png",
                  title: "Go live",
                  description: "Connect your domain and launch. We maintain, update, and manage everything.",
                  image: "/undraw_ship-it_vn4g.svg"
                }
              ].map((step, index) => (
                <div
                  key={index}
                  className="group relative cursor-pointer transition-all duration-300 hover:translate-x-2"
                  onMouseEnter={() => setActiveStep(index)}
                >
                  <div className="flex gap-6">
                    {/* Number Circle */}
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-[#f8f9fa] flex items-center justify-center border-2 border-transparent group-hover:border-foreground transition-all duration-300">
                        <img src={step.number} alt="" className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-2">
                      <h3 className="text-headline-small font-montserrat mb-2 group-hover:text-foreground transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-body-medium leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Image Display */}
            <div className="relative h-[400px] hidden md:block">
              <div className="" />
              {[
                {
                  src: "/undraw_website-builder_4go7.svg",
                  alt: "Collaborate on your vision - Team meeting"
                },
                {
                  src: "/undraw_pay-with-credit-card_77g6.svg",
                  alt: "Choose your plan - Business planning"
                },
                {
                  src: "/undraw_ship-it_vn4g.svg",
                  alt: "Launch and grow - Analytics dashboard"
                }
              ].map((image, index) => (
                <img
                  key={index}
                  src={image.src}
                  alt={image.alt}
                  className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${activeStep === index ? "opacity-100" : "opacity-0"
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Background transition */}
      <div className="bg-surface">
        {/* Pricing Plans */}
        <section id="plans" className="container mx-auto px-6 md:px-12 py-20 md:py-32">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16 max-w-3xl">
              <h2 className="text-display-small mb-4 font-montserrat">
                Easy on the wallet
              </h2>
              <p className="text-body-large">
                Pay monthly or annually. No hidden fees. Cancel anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <Card
                  key={index}
                  className={`relative rounded-none shadow-none border ${plan.highlight
                    ? "shadow-lg"
                    : ""
                    }`}
                >
                  {/* Corner Icons - inspired by card-6 */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    width={24}
                    height={24}
                    strokeWidth="1"
                    stroke="currentColor"
                    className="text-foreground size-6 absolute -top-3 -left-3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    width={24}
                    height={24}
                    strokeWidth="1"
                    stroke="currentColor"
                    className="text-foreground size-6 absolute -top-3 -right-3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    width={24}
                    height={24}
                    strokeWidth="1"
                    stroke="currentColor"
                    className="text-foreground size-6 absolute -bottom-3 -left-3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    width={24}
                    height={24}
                    strokeWidth="1"
                    stroke="currentColor"
                    className="text-foreground size-6 absolute -bottom-3 -right-3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>

                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-background px-3 py-1 text-xs font-medium hover:bg-[#1c2228]">
                        Most popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-8">
                    <CardTitle className="text-headline-medium font-normal font-montserrat mb-2">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-body-medium mb-6">
                      {plan.description}
                    </CardDescription>
                    <div className="pt-2">
                      <span className="text-[40px] font-normal text-foreground font-montserrat">
                        Ksh {plan.price}
                      </span>
                      <span className="text-body-medium font-montserrat">/month</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-8">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-body-medium">{feature}</span>
                      </div>
                    ))}
                  </CardContent>

                  <CardFooter>
                    <Button
                      className={`w-full h-11 text-sm font-medium cursor-pointer ${plan.highlight
                        ? "google-button-primary"
                        : "google-button-secondary"
                        }`}
                      onClick={() => setIsAuthOpen(true)}
                    >
                      {plan.cta}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
          {/* Auth Dialog */}
          <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Welcome to Menengai Cloud</DialogTitle>
              </DialogHeader>
              <AuthPopup />
            </DialogContent>
          </Dialog>
        </section>
        {/* Why Menengai Cloud */}
        <section className="container mx-auto px-6 md:px-12 pb-20 md:pb-32">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-display-small mb-16 max-w-3xl font-montserrat">
              Get to<span className="font-bold"> actually</span> sit back and relax
            </h2>

            <div className="grid md:grid-cols-3 gap-16">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#1c2228]" />
                </div>
                <h3 className="text-headline-small font-montserrat">Actually fast</h3>
                <p className="text-body-medium">
                  Built on cutting-edge infrastructure. Your site loads instantly, everywhere.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#1c2228]" />
                </div>
                <h3 className="text-headline-small font-montserrat">Actually protected</h3>
                <p className="text-body-medium">
                  SSL, backups, and monitoring included. Sleep easy knowing we've got you covered.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#1c2228]" />
                </div>
                <h3 className="text-headline-small font-montserrat">Actually managed</h3>
                <p className="text-body-medium">
                  We handle updates, fixes, and improvements. You focus on your business.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* CTA Section */}
      <section className="container mx-auto px-6 md:px-12 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-display-medium mb-6 font-montserrat">
            Ready to get started?
          </h2>
          <p className="text-body-large mb-10 max-w-2xl mx-auto">
            Stop renting someone else's platform. Build something that's truly yours.
          </p>
          <Button className="google-button-primary px-10 py-6 text-base h-auto cursor-pointer" onClick={() => setIsAuthOpen(true)}>
            Okay, let's do this!
          </Button>
        </div>
      </section>

    </div>
  )
}