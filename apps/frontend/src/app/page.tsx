'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { IntegrationsCanvasSection } from '@/components/landing/integrations-canvas';
import { PlatformWorkflowSection } from '@/components/landing/platform-workflows';
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

// Old inline integration tools data (superseded by imported components)
const _legacyIntegrationTools = [
  // CRMs
  { name: 'Salesforce', category: 'CRM', color: '#00A1E0', x: 8, y: 15 },
  { name: 'HubSpot', category: 'CRM', color: '#FF7A59', x: 22, y: 8 },
  { name: 'Zoho', category: 'CRM', color: '#D32F2F', x: 15, y: 30 },
  // Marketing
  { name: 'Mailchimp', category: 'Email', color: '#FFE01B', x: 35, y: 12 },
  { name: 'SendGrid', category: 'Email', color: '#1A82E2', x: 42, y: 28 },
  // Ads
  { name: 'Google Ads', category: 'Ads', color: '#4285F4', x: 55, y: 8 },
  { name: 'Meta Ads', category: 'Ads', color: '#0668E1', x: 62, y: 22 },
  // Social
  { name: 'Instagram', category: 'Social', color: '#E4405F', x: 75, y: 10 },
  { name: 'LinkedIn', category: 'Social', color: '#0A66C2', x: 82, y: 25 },
  { name: 'TikTok', category: 'Social', color: '#000000', x: 88, y: 12 },
  // Automation
  { name: 'Zapier', category: 'Automation', color: '#FF4A00', x: 28, y: 42 },
  { name: 'n8n', category: 'Automation', color: '#EA4B71', x: 48, y: 45 },
  { name: 'Make', category: 'Automation', color: '#6D00CC', x: 68, y: 42 },
  // Analytics
  { name: 'GA4', category: 'Analytics', color: '#E37400', x: 12, y: 48 },
  { name: 'Stripe', category: 'Payment', color: '#635BFF', x: 85, y: 40 },
  // Platforms
  { name: 'WordPress', category: 'CMS', color: '#21759B', x: 38, y: 32 },
  { name: 'Shopify', category: 'Commerce', color: '#96BF48', x: 58, y: 35 },
  { name: 'Slack', category: 'Comms', color: '#4A154B', x: 78, y: 35 },
];

function _LegacyIntegrationsCanvasSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const categories = ['CRM', 'Email', 'Ads', 'Social', 'Automation', 'Analytics', 'CMS', 'Commerce', 'Payment', 'Comms'];
  const categoryColors: Record<string, string> = {
    CRM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Email: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Ads: 'bg-green-500/20 text-green-400 border-green-500/30',
    Social: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    Automation: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Analytics: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    CMS: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    Commerce: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    Payment: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Comms: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  };

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 bg-[#0a0a0f] overflow-hidden">
      {/* Canvas grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Globe className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400 font-medium">Open Ecosystem</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Plug Into Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Favorite Tools</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Connect with 50+ CRMs, platforms, and tools via APIs. Build custom workflows like n8n - automate everything.
          </p>
        </div>

        {/* Category Filter */}
        <div className={`flex flex-wrap justify-center gap-2 mb-12 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !activeCategory ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-500 border-gray-800 hover:border-gray-600'
            }`}
          >
            All
          </button>
          {['CRM', 'Ads', 'Social', 'Automation', 'Email'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeCategory === cat ? categoryColors[cat] : 'bg-transparent text-gray-500 border-gray-800 hover:border-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Canvas - Tool Nodes */}
        <div className={`relative w-full aspect-[2.5/1] md:aspect-[3/1] rounded-2xl border border-gray-800/50 bg-gray-950/50 backdrop-blur overflow-hidden transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {/* Center MarketAI Hub */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs font-bold text-orange-400">MarketAI</span>
              </div>
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-2xl border-2 border-orange-500/30 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute -inset-4 rounded-3xl border border-orange-500/10 animate-ping" style={{ animationDuration: '4s' }} />
            </div>
          </div>

          {/* Connection lines from center to each tool */}
          <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
            {integrationTools.map((tool, i) => {
              const isFiltered = activeCategory && tool.category !== activeCategory;
              return (
                <line
                  key={`line-${i}`}
                  x1="50%"
                  y1="50%"
                  x2={`${tool.x}%`}
                  y2={`${tool.y}%`}
                  stroke={tool.color}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className={`transition-opacity duration-500 ${isFiltered ? 'opacity-5' : 'opacity-20'}`}
                />
              );
            })}
          </svg>

          {/* Tool nodes */}
          {integrationTools.map((tool, i) => {
            const isFiltered = activeCategory && tool.category !== activeCategory;
            return (
              <div
                key={tool.name}
                className={`absolute z-20 group transition-all duration-700 ${
                  isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                } ${isFiltered ? '!opacity-10 !scale-75' : ''}`}
                style={{
                  left: `${tool.x}%`,
                  top: `${tool.y}%`,
                  transform: `translate(-50%, -50%) ${isVisible && !isFiltered ? 'scale(1)' : 'scale(0)'}`,
                  transitionDelay: isVisible ? `${300 + i * 80}ms` : '0ms',
                }}
              >
                <div className="relative cursor-pointer">
                  <div
                    className="w-11 h-11 md:w-14 md:h-14 rounded-xl flex items-center justify-center border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm group-hover:scale-125 group-hover:border-gray-500 transition-all duration-300 shadow-lg"
                    style={{ boxShadow: `0 0 20px ${tool.color}15` }}
                  >
                    <span className="text-[10px] md:text-xs font-bold text-gray-300 group-hover:text-white transition-colors text-center leading-tight">
                      {tool.name.length > 8 ? tool.name.split(' ')[0] : tool.name}
                    </span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    <span className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
                      {tool.name} ({tool.category})
                    </span>
                  </div>
                  {/* Glow */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"
                    style={{ backgroundColor: tool.color + '30' }}
                  />
                </div>
              </div>
            );
          })}

          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute w-1 h-1 rounded-full bg-orange-400/40"
              style={{
                left: `${20 + i * 12}%`,
                top: `${30 + (i % 3) * 15}%`,
                animation: `float ${4 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* Bottom info cards */}
        <div className={`grid md:grid-cols-3 gap-4 mt-10 transition-all duration-700 delay-[800ms] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="p-5 rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <h4 className="text-white font-semibold mb-1">REST API Access</h4>
            <p className="text-gray-500 text-sm">Full API documentation. Build custom integrations with any platform.</p>
          </div>
          <div className="p-5 rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-orange-400" />
            </div>
            <h4 className="text-white font-semibold mb-1">Workflow Builder</h4>
            <p className="text-gray-500 text-sm">Create automated workflows like n8n. Connect triggers, actions, and conditions.</p>
          </div>
          <div className="p-5 rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <h4 className="text-white font-semibold mb-1">Enterprise Ready</h4>
            <p className="text-gray-500 text-sm">SSO, webhooks, custom domains. Deploy on your own infrastructure.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Platform workflow data
const platformWorkflows = [
  {
    name: 'Google',
    icon: '🔍',
    color: 'from-blue-500 to-green-500',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/5',
    steps: ['Search Ads Campaign', 'Keyword Targeting', 'A/B Ad Copies', 'Bid Optimization', 'Analytics Sync'],
  },
  {
    name: 'Meta',
    icon: '📘',
    color: 'from-blue-600 to-indigo-600',
    borderColor: 'border-blue-600/30',
    bgColor: 'bg-blue-600/5',
    steps: ['Audience Builder', 'Ad Creative Gen', 'Campaign Launch', 'Retargeting', 'ROAS Tracking'],
  },
  {
    name: 'Instagram',
    icon: '📸',
    color: 'from-pink-500 to-purple-600',
    borderColor: 'border-pink-500/30',
    bgColor: 'bg-pink-500/5',
    steps: ['Content Calendar', 'AI Captions', 'Hashtag Strategy', 'Auto-Post', 'Engagement Track'],
  },
  {
    name: 'LinkedIn',
    icon: '💼',
    color: 'from-sky-600 to-blue-700',
    borderColor: 'border-sky-600/30',
    bgColor: 'bg-sky-600/5',
    steps: ['B2B Targeting', 'Thought Leadership', 'Company Posts', 'Lead Gen Forms', 'Pipeline Sync'],
  },
  {
    name: 'Facebook',
    icon: '👥',
    color: 'from-blue-500 to-blue-700',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/5',
    steps: ['Page Management', 'Post Scheduling', 'Community Engage', 'Pixel Tracking', 'Custom Audience'],
  },
];

function _LegacyPlatformWorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activePlatform, setActivePlatform] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-rotate platforms
  useEffect(() => {
    if (!isVisible) return;
    const timer = setInterval(() => {
      setActivePlatform((p) => (p + 1) % platformWorkflows.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isVisible]);

  const platform = platformWorkflows[activePlatform];

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 bg-white overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6">
            <Play className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-pink-500 font-medium">Live Platform Workflows</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            See How It Works on
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600"> Every Platform</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Each platform gets its own AI-powered automation pipeline. Click to explore the live workflow.
          </p>
        </div>

        {/* Platform Tabs */}
        <div className={`flex flex-wrap justify-center gap-3 mb-12 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {platformWorkflows.map((p, i) => (
            <button
              key={p.name}
              onClick={() => setActivePlatform(i)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-300 border ${
                activePlatform === i
                  ? `bg-gradient-to-r ${p.color} text-white border-transparent shadow-lg scale-105`
                  : `bg-white text-gray-600 ${p.borderColor} hover:shadow-md hover:scale-[1.02]`
              }`}
            >
              <span className="text-lg">{p.icon}</span>
              {p.name}
            </button>
          ))}
        </div>

        {/* Workflow Visualization */}
        <div className={`max-w-5xl mx-auto transition-all duration-700 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`relative p-8 md:p-12 rounded-2xl border ${platform.borderColor} ${platform.bgColor} transition-all duration-500`}>
            {/* Platform header */}
            <div className="flex items-center gap-3 mb-10">
              <span className="text-3xl">{platform.icon}</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{platform.name} Automation Pipeline</h3>
                <p className="text-sm text-gray-500">AI-powered workflow running on autopilot</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Live</span>
              </div>
            </div>

            {/* Flow Steps */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-0">
              {platform.steps.map((step, i) => (
                <div key={`${platform.name}-${i}`} className="flex items-center gap-3 md:flex-1">
                  {/* Step Node */}
                  <div
                    className={`flex-shrink-0 relative transition-all duration-500 ${
                      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                    }`}
                    style={{ transitionDelay: `${500 + i * 200}ms` }}
                  >
                    <div className={`w-full md:w-auto px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 cursor-default`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${platform.color} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-[10px] font-bold">{i + 1}</span>
                        </div>
                        <span className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">{step}</span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow connector (not on last) */}
                  {i < platform.steps.length - 1 && (
                    <div className="hidden md:flex items-center flex-shrink-0 mx-1">
                      <div className={`w-6 h-[2px] bg-gradient-to-r ${platform.color} opacity-40`} />
                      <div className={`w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] opacity-40`}
                        style={{ borderLeftColor: activePlatform === 0 ? '#3b82f6' : activePlatform === 1 ? '#4f46e5' : activePlatform === 2 ? '#ec4899' : activePlatform === 3 ? '#0284c7' : '#3b82f6' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-8 h-1 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${platform.color} transition-all duration-[4000ms] ease-linear`}
                style={{ width: isVisible ? '100%' : '0%' }}
                key={activePlatform}
              />
            </div>
          </div>
        </div>
      </div>
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

      {/* Integrations Canvas */}
      <IntegrationsCanvasSection />

      {/* Platform Workflow Showcase */}
      <PlatformWorkflowSection />

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
