'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { publicApi } from '@/lib/api';
import {
  Sparkles,
  Zap,
  Calendar,
  BarChart3,
  Globe,
  Shield,
  Users,
  ArrowRight,
  Check,
  Play,
  Star,
  TrendingUp,
  Clock,
  Target,
  Loader2,
  Search,
  Brain,
  PenTool,
  Megaphone,
  UserPlus,
  LineChart,
} from 'lucide-react';
import { useRef, useCallback } from 'react';

// Plan type from API
interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyDiscount: number;
  credits: number;
  features: string[];
  isDefault: boolean;
  isPopular: boolean;
}

// Company logos for the marquee
const companyLogos = [
  'Acme Corp', 'TechFlow', 'Innovate', 'StartupX', 'GrowthLab',
  'MediaPro', 'BrandHub', 'MarketEdge', 'SocialBoost', 'ContentKing',
];

// Features data
const features = [
  {
    icon: Sparkles,
    title: 'AI Content Generation',
    description: 'Create engaging posts, captions, and articles in seconds with advanced AI that understands your brand voice.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Automatically schedule content at optimal times when your audience is most active across all platforms.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track performance, engagement, and ROI with comprehensive analytics and actionable insights.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Globe,
    title: 'Multi-Platform Publishing',
    description: 'Publish to Instagram, Facebook, Twitter, LinkedIn, and WordPress from a single dashboard.',
    color: 'from-purple-500 to-pink-500',
  },
];

// Solutions data
const solutions = [
  {
    title: 'Content Marketers',
    description: 'Scale your content production 10x without sacrificing quality. Generate blog posts, social media content, and more.',
    stats: '10x faster content creation',
    icon: Target,
  },
  {
    title: 'Social Media Managers',
    description: 'Manage multiple accounts, schedule posts in advance, and track engagement across all platforms.',
    stats: '50% time saved on scheduling',
    icon: Clock,
  },
  {
    title: 'Growth Teams',
    description: 'Run data-driven campaigns, A/B test content variations, and optimize for maximum engagement.',
    stats: '3x engagement increase',
    icon: TrendingUp,
  },
];

// Testimonials data
const testimonials = [
  {
    quote: "Jeeper has completely transformed how we approach content marketing. We've saved over 10,000 hours annually.",
    author: 'Sarah Chen',
    role: 'VP of Marketing',
    company: 'TechFlow Inc.',
    avatar: 'SC',
    stat: '10,000+ hours saved',
  },
  {
    quote: "The AI understands our brand voice perfectly. It's like having an entire content team at our fingertips.",
    author: 'Michael Rivera',
    role: 'Content Director',
    company: 'GrowthLab',
    avatar: 'MR',
    stat: '60% faster production',
  },
  {
    quote: "Finally, a tool that actually delivers on its AI promises. Our engagement rates have tripled since using Jeeper.",
    author: 'Emily Watson',
    role: 'Social Media Lead',
    company: 'BrandHub',
    avatar: 'EW',
    stat: '3x engagement boost',
  },
];

// Fallback pricing data (used while loading or on error)
const fallbackPlans: Plan[] = [
  {
    id: '1',
    name: 'STARTER',
    displayName: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 278.40,
    yearlyDiscount: 20,
    credits: 1000,
    description: 'Perfect for individuals and small teams getting started.',
    features: [
      '1,000 AI credits/month',
      '3 social accounts',
      'Basic analytics',
      'Email support',
    ],
    isDefault: true,
    isPopular: false,
  },
  {
    id: '2',
    name: 'PROFESSIONAL',
    displayName: 'Professional',
    monthlyPrice: 79,
    yearlyPrice: 758.40,
    yearlyDiscount: 20,
    credits: 5000,
    description: 'For growing teams that need more power and flexibility.',
    features: [
      '5,000 AI credits/month',
      '10 social accounts',
      'Advanced analytics',
      'Priority support',
      'Team collaboration',
      'Custom templates',
    ],
    isDefault: false,
    isPopular: true,
  },
  {
    id: '3',
    name: 'ENTERPRISE',
    displayName: 'Enterprise',
    monthlyPrice: 199,
    yearlyPrice: 1910.40,
    yearlyDiscount: 20,
    credits: 50000,
    description: 'For large organizations with advanced security needs.',
    features: [
      'Unlimited AI credits',
      'Unlimited accounts',
      'Custom integrations',
      'Dedicated success manager',
      'SSO & advanced security',
      'Custom AI training',
    ],
    isDefault: false,
    isPopular: false,
  },
];

// Automation flow steps
const flowSteps = [
  {
    icon: Search,
    title: 'Scan Website',
    description: 'AI reads your site, extracts brand voice, products & services',
    color: 'from-blue-500 to-cyan-500',
    glow: 'shadow-blue-500/20',
  },
  {
    icon: Brain,
    title: 'Analyze & Strategize',
    description: 'Competitors, trends, audience insights & market intelligence',
    color: 'from-purple-500 to-violet-500',
    glow: 'shadow-purple-500/20',
  },
  {
    icon: PenTool,
    title: 'Generate Content',
    description: 'Articles, social posts, videos, flyers, email campaigns',
    color: 'from-orange-500 to-red-500',
    glow: 'shadow-orange-500/20',
  },
  {
    icon: Megaphone,
    title: 'Launch Campaigns',
    description: 'Google Ads, Meta Ads, social publishing across platforms',
    color: 'from-pink-500 to-rose-500',
    glow: 'shadow-pink-500/20',
  },
  {
    icon: UserPlus,
    title: 'Capture Leads',
    description: 'CRM pipeline, lead scoring, automated follow-ups',
    color: 'from-green-500 to-emerald-500',
    glow: 'shadow-green-500/20',
  },
  {
    icon: LineChart,
    title: 'Track & Optimize',
    description: 'Analytics, ROI tracking, AI-powered optimization',
    color: 'from-amber-500 to-yellow-500',
    glow: 'shadow-amber-500/20',
  },
];

function AutomationFlowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-gray-950 overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className={`text-center mb-16 lg:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-400 font-medium">Fully Automated Pipeline</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            How MarketAI <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-500">Automates</span> Your Marketing
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            From scanning your website to tracking ROI - our AI handles every step of your digital marketing pipeline
          </p>
        </div>

        {/* Flow Diagram - Desktop */}
        <div className="hidden lg:block relative">
          {/* Connection Lines SVG */}
          <svg className="absolute top-[60px] left-0 w-full h-[4px] z-0" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="20%" stopColor="#8b5cf6" />
                <stop offset="40%" stopColor="#f97316" />
                <stop offset="60%" stopColor="#ec4899" />
                <stop offset="80%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <line
              x1="8.3%"
              y1="50%"
              x2="91.7%"
              y2="50%"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeDasharray="8 4"
              className={`transition-all duration-[2s] ease-out ${isVisible ? 'opacity-60' : 'opacity-0'}`}
              style={{
                strokeDashoffset: isVisible ? 0 : 1000,
              }}
            />
          </svg>

          {/* Flowing dot animation */}
          <div className={`absolute top-[57px] left-0 w-full h-[10px] z-[1] overflow-hidden ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div
              className="absolute w-3 h-3 rounded-full bg-orange-400 shadow-lg shadow-orange-400/50"
              style={{
                animation: isVisible ? 'flowDot 3s ease-in-out infinite' : 'none',
              }}
            />
            <div
              className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50"
              style={{
                animation: isVisible ? 'flowDot 3s ease-in-out infinite 1s' : 'none',
              }}
            />
            <div
              className="absolute w-3 h-3 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50"
              style={{
                animation: isVisible ? 'flowDot 3s ease-in-out infinite 2s' : 'none',
              }}
            />
          </div>

          {/* Flow Nodes */}
          <div className="grid grid-cols-6 gap-4">
            {flowSteps.map((step, index) => (
              <div
                key={step.title}
                className={`relative flex flex-col items-center text-center group transition-all duration-700 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-12'
                }`}
                style={{
                  transitionDelay: isVisible ? `${index * 200}ms` : '0ms',
                }}
              >
                {/* Step Number */}
                <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center z-10">
                  <span className="text-xs font-bold text-gray-400">{index + 1}</span>
                </div>

                {/* Icon Circle */}
                <div className={`relative w-[120px] h-[120px] rounded-2xl bg-gradient-to-br ${step.color} p-[2px] mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="w-full h-full rounded-2xl bg-gray-950 flex items-center justify-center">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  {/* Glow effect */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`} />
                </div>

                {/* Text */}
                <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-orange-400 transition-colors">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed px-1 group-hover:text-gray-400 transition-colors">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Diagram - Mobile (Vertical) */}
        <div className="lg:hidden space-y-0">
          {flowSteps.map((step, index) => (
            <div key={step.title} className="relative">
              <div
                className={`flex items-start gap-4 py-6 transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                }`}
                style={{
                  transitionDelay: isVisible ? `${index * 150}ms` : '0ms',
                }}
              >
                {/* Left: Number + Icon */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} p-[2px]`}>
                    <div className="w-full h-full rounded-xl bg-gray-950 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  {/* Vertical connector */}
                  {index < flowSteps.length - 1 && (
                    <div className="w-[2px] h-8 bg-gradient-to-b from-gray-700 to-transparent mt-2" />
                  )}
                </div>

                {/* Right: Text */}
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-600">0{index + 1}</span>
                    <h3 className="text-white font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-gray-500 text-sm">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-16 transition-all duration-700 delay-[1200ms] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-gray-500 mb-4">All running on autopilot. No marketing expertise needed.</p>
          <Link href="/register">
            <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-full shadow-lg shadow-orange-500/25">
              Start Automating Now
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* CSS for flowing dot animation */}
      <style jsx>{`
        @keyframes flowDot {
          0% { left: 5%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 95%; opacity: 0; }
        }
      `}</style>
    </section>
  );
}

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await publicApi.getPlans();
        if (response.data.plans && response.data.plans.length > 0) {
          setPlans(response.data.plans);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        // Keep fallback plans on error
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-blue-50" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float animation-delay-200" />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float animation-delay-400" />

        <div className="container relative mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span>Introducing Jeeper AI Agents</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-gray-900 mb-6 animate-fade-in-up">
              Put AI agents to work
              <span className="block gradient-text">for your marketing</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 animate-fade-in-up animation-delay-200">
              Generate compelling content, automate campaigns, and grow your audience with AI-powered marketing that understands your brand.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-400">
              <Link href="/register">
                <Button size="lg" className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all">
                  Start free trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 py-6 text-lg font-medium border-2"
              >
                <Play className="mr-2 w-5 h-5" />
                Watch demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500 animate-fade-in animation-delay-600">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2">4.9/5 from 500+ reviews</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-gray-300" />
              <span>Trusted by 10,000+ marketers</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Animated Flow Diagram */}
      <AutomationFlowSection />

      {/* Logo Marquee */}
      <section className="py-12 border-y border-gray-100 bg-gray-50/50">
        <div className="container mx-auto px-4 lg:px-8">
          <p className="text-center text-sm text-gray-500 mb-8">Trusted by marketing teams at</p>
          <div className="marquee-container overflow-hidden">
            <div className="flex animate-marquee">
              {[...companyLogos, ...companyLogos].map((logo, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 mx-8 px-6 py-3 bg-white rounded-lg border border-gray-100 shadow-sm"
                >
                  <span className="text-gray-400 font-semibold whitespace-nowrap">{logo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything you need to
              <span className="gradient-text"> scale your marketing</span>
            </h2>
            <p className="text-lg text-gray-600">
              From content creation to analytics, Jeeper provides all the tools you need to automate and optimize your marketing efforts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-20 lg:py-32 bg-gray-900 text-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Built for every
              <span className="text-orange-400"> marketing role</span>
            </h2>
            <p className="text-lg text-gray-400">
              Whether you're a solo marketer or part of an enterprise team, Jeeper adapts to your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {solutions.map((solution) => (
              <div
                key={solution.title}
                className="group p-8 bg-gray-800/50 rounded-2xl border border-gray-700 hover:border-orange-500/50 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:bg-orange-500/20 transition-colors">
                  <solution.icon className="w-7 h-7 text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{solution.title}</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">{solution.description}</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-400 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  {solution.stats}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Loved by marketers
              <span className="gradient-text"> worldwide</span>
            </h2>
            <p className="text-lg text-gray-600">
              See what marketing professionals are saying about Jeeper.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.author}
                className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                {/* Stats Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
                  <Check className="w-4 h-4" />
                  {testimonial.stat}
                </div>

                {/* Quote */}
                <p className="text-gray-700 leading-relaxed mb-6">"{testimonial.quote}"</p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Simple, transparent
              <span className="gradient-text"> pricing</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Start free. Upgrade when you're ready. No hidden fees.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 bg-gray-100 rounded-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {isLoadingPlans ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => {
                const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice / 12;
                const isPopular = plan.isPopular;

                return (
                  <div
                    key={plan.id}
                    className={`relative p-8 rounded-2xl transition-all duration-300 ${
                      isPopular
                        ? 'bg-gray-900 text-white scale-105 shadow-2xl'
                        : 'bg-white border border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-sm font-medium rounded-full">
                        Most Popular
                      </div>
                    )}

                    <h3 className={`text-xl font-semibold mb-2 ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                      {plan.displayName}
                    </h3>
                    <p className={`text-sm mb-6 ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
                      {plan.description}
                    </p>

                    <div className="mb-6">
                      <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                        ${price.toFixed(0)}
                      </span>
                      <span className={isPopular ? 'text-gray-400' : 'text-gray-500'}>/month</span>
                      {billingCycle === 'yearly' && (
                        <div className={`text-sm mt-1 ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
                          Billed ${plan.yearlyPrice.toFixed(0)}/year
                        </div>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <Check className={`w-5 h-5 flex-shrink-0 ${isPopular ? 'text-orange-400' : 'text-green-500'}`} />
                          <span className={`text-sm ${isPopular ? 'text-gray-300' : 'text-gray-600'}`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link href={`/register?plan=${plan.name.toLowerCase()}&billing=${billingCycle}`}>
                      <Button
                        className={`w-full rounded-full py-6 font-medium ${
                          isPopular
                            ? 'bg-white text-gray-900 hover:bg-gray-100'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                      >
                        {plan.name === 'ENTERPRISE' ? 'Contact sales' : 'Start free trial'}
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-8 py-16 lg:px-16 lg:py-24">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-10" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />

            <div className="relative text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to transform your marketing?
              </h2>
              <p className="text-lg text-gray-400 mb-10">
                Join 10,000+ marketers who are already using Jeeper to scale their content and grow their audience.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 rounded-full px-8 py-6 text-lg font-medium shadow-lg">
                    Start free trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#pricing">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full px-8 py-6 text-lg font-medium border-2 border-gray-600 text-white hover:bg-white/10"
                  >
                    View pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
