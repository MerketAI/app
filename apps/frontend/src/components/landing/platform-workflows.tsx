'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Check, Zap, TrendingUp, Users, Eye, MousePointerClick, DollarSign, Heart, MessageCircle, Share2, Bookmark, Send } from 'lucide-react';

// Platform data with rich content
const platforms = [
  {
    id: 'google',
    name: 'Google Ads',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M12 11.5v5.2l4.5-2.6V9L12 11.5z" fill="#FBBC04"/>
        <path d="M7.5 14.1V9L12 11.5v5.2L7.5 14.1z" fill="#4285F4"/>
        <path d="M12 6.3L7.5 9l4.5 2.5L16.5 9 12 6.3z" fill="#34A853"/>
        <path d="M16.5 9v5.1L12 16.7v-5.2L16.5 9z" fill="#EA4335"/>
      </svg>
    ),
    color: 'from-blue-500 to-green-500',
    device: 'laptop',
    input: { label: 'Your Goal', text: '"Get 200 leads for summer sneaker sale at $5 CPA"' },
    aiSteps: ['Keyword Research (2,400 keywords analyzed)', 'Audience Segmentation (3 cohorts built)', 'Ad Copy Generation (12 variations)'],
    output: {
      type: 'ads',
      ads: [
        { headline: 'Summer Sneaker Sale - 30% Off', desc: 'Premium running shoes at unbeatable prices. Free shipping on orders $50+', ctr: '4.2%', cpc: '$0.82' },
        { headline: 'Limited Time: Designer Sneakers', desc: 'Top brands up to 30% off. Shop the collection before it sells out', ctr: '3.8%', cpc: '$0.91' },
        { headline: 'Run in Style This Summer', desc: 'New arrivals just dropped. Performance meets fashion at 30% off', ctr: '5.1%', cpc: '$0.74' },
      ],
    },
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2"/>
        <circle cx="12" cy="12" r="5" stroke="url(#ig)" strokeWidth="2"/>
        <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig)"/>
        <defs><linearGradient id="ig" x1="2" y1="22" x2="22" y2="2"><stop stopColor="#F58529"/><stop offset=".5" stopColor="#DD2A7B"/><stop offset="1" stopColor="#8134AF"/></linearGradient></defs>
      </svg>
    ),
    color: 'from-pink-500 to-purple-600',
    device: 'phone',
    input: { label: 'Your Product', text: '"New organic coffee blend - earthy, bold, sustainably sourced"' },
    aiSteps: ['Visual Style Analysis', 'Caption + Hashtag Generation', 'Optimal Post Time (Tue 9:15 AM)'],
    output: {
      type: 'post',
      caption: 'Rise and grind with our new organic blend. Bold flavor, zero guilt. Sustainably sourced from Colombian highlands.',
      hashtags: ['#OrganicCoffee', '#CoffeeLover', '#Sustainable', '#MorningVibes', '#BoldFlavor'],
      metrics: { likes: '1,247', comments: '89', shares: '34', saves: '156' },
    },
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0668E1">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    ),
    color: 'from-blue-600 to-indigo-600',
    device: 'laptop',
    input: { label: 'Business Objective', text: '"Generate leads for our fitness app - target health-conscious millennials"' },
    aiSteps: ['Lookalike Audience (2.4M reach)', 'Creative A/B Testing (8 variants)', 'Budget Optimization ($50/day)'],
    output: {
      type: 'campaign',
      name: 'Fitness App - Lead Gen Q2',
      audience: '2.4M potential reach',
      budget: '$50/day',
      estLeads: '45-60 leads/day',
      roas: '4.2x projected',
    },
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: 'from-sky-600 to-blue-700',
    device: 'laptop',
    input: { label: 'Content Brief', text: '"Announce our Series B funding - $15M raised, 3x team growth"' },
    aiSteps: ['Professional Tone Calibration', 'Engagement Hook Optimization', 'CTA + Hashtag Strategy'],
    output: {
      type: 'linkedin-post',
      text: "Thrilled to share that we've raised $15M in Series B funding! This milestone reflects our team's dedication to transforming how businesses approach marketing automation.\n\nWhat's next:\n→ Tripling our engineering team\n→ Expanding to 12 new markets\n→ Launching AI-powered analytics\n\nGrateful to our investors, team, and 10K+ customers who made this possible.",
      metrics: { impressions: '45.2K', reactions: '892', comments: '134' },
    },
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: 'from-blue-500 to-blue-700',
    device: 'laptop',
    input: { label: 'Event Details', text: '"Weekend farmers market - live music, 30+ local vendors, family friendly"' },
    aiSteps: ['Community Tone Matching', 'Event Boost Targeting (15mi radius)', 'Engagement Prediction (High)'],
    output: {
      type: 'fb-post',
      text: "This Saturday is going to be AMAZING at the Downtown Farmers Market! 🎵🥬\n\nJoin us for:\n🎶 Live music from local artists\n🥕 30+ farm-fresh vendors\n👨‍👩‍👧‍👦 Kid-friendly activities all day\n\nSaturday, 9 AM - 2 PM | Main Street Plaza\nTag someone you'd bring! 👇",
      boost: { reach: '12,400', budget: '$25', duration: '3 days' },
    },
  },
];

// Phone mockup component
function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[240px] md:w-[280px]">
      {/* Phone frame */}
      <div className="relative rounded-[2rem] border-[3px] border-gray-700 bg-gray-950 p-1 shadow-2xl shadow-black/50">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-950 rounded-b-xl z-10" />
        {/* Screen */}
        <div className="rounded-[1.7rem] overflow-hidden bg-white">
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Laptop mockup component
function LaptopMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Screen */}
      <div className="rounded-t-xl border-[3px] border-gray-700 border-b-0 bg-gray-950 p-1">
        {/* Camera dot */}
        <div className="flex justify-center py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
        </div>
        <div className="rounded-lg overflow-hidden bg-white">
          {children}
        </div>
      </div>
      {/* Base */}
      <div className="h-3 bg-gray-700 rounded-b-lg mx-[-2px]" />
      <div className="h-1 bg-gray-600 rounded-b mx-8" />
    </div>
  );
}

// AI Processing indicator
function AIProcessing({ steps, isActive }: { steps: string[]; isActive: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isActive) { setCurrentStep(0); return; }
    const timer = setInterval(() => {
      setCurrentStep((s) => (s + 1) % steps.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [isActive, steps.length]);

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div
          key={step}
          className={`flex items-center gap-3 transition-all duration-500 ${
            i <= currentStep ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            i < currentStep ? 'bg-green-500' : i === currentStep ? 'bg-orange-500 animate-pulse' : 'bg-gray-700'
          }`}>
            {i < currentStep ? (
              <Check className="w-3 h-3 text-white" />
            ) : i === currentStep ? (
              <Sparkles className="w-3 h-3 text-white" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            )}
          </div>
          <span className={`text-xs ${i <= currentStep ? 'text-gray-300' : 'text-gray-600'}`}>{step}</span>
        </div>
      ))}
    </div>
  );
}

export function PlatformWorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activePlatform, setActivePlatform] = useState(0);
  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset output animation on platform change
  useEffect(() => {
    setShowOutput(false);
    const timer = setTimeout(() => setShowOutput(true), 2000);
    return () => clearTimeout(timer);
  }, [activePlatform]);

  // Auto-rotate
  useEffect(() => {
    if (!isVisible) return;
    const timer = setInterval(() => {
      setActivePlatform((p) => (p + 1) % platforms.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isVisible]);

  const platform = platforms[activePlatform];

  const renderDeviceContent = () => {
    const output = platform.output;

    if (platform.id === 'instagram') {
      return (
        <PhoneMockup>
          <div className="h-[360px] md:h-[400px]">
            {/* Instagram header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600" />
                <span className="text-[11px] font-semibold text-gray-900">yourbrand</span>
              </div>
              <span className="text-gray-400 text-xs">...</span>
            </div>
            {/* Post image placeholder */}
            <div className="aspect-square bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 flex items-center justify-center">
              <span className="text-4xl">☕</span>
            </div>
            {/* Actions */}
            <div className="px-3 py-2 flex items-center gap-4">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              <MessageCircle className="w-5 h-5 text-gray-700" />
              <Share2 className="w-5 h-5 text-gray-700" />
              <Bookmark className="w-5 h-5 text-gray-700 ml-auto" />
            </div>
            {/* Metrics */}
            {showOutput && 'metrics' in output && (
              <div className="px-3">
                <p className="text-[11px] font-semibold text-gray-900">{output.metrics.likes} likes</p>
                <p className="text-[11px] text-gray-900 mt-1">
                  <span className="font-semibold">yourbrand </span>
                  <span className="text-gray-600">{(output as any).caption?.substring(0, 80)}...</span>
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(output as any).hashtags?.slice(0, 3).map((h: string) => (
                    <span key={h} className="text-[10px] text-blue-500">{h}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PhoneMockup>
      );
    }

    // Laptop content for all other platforms
    return (
      <LaptopMockup>
        <div className="h-[280px] md:h-[320px] p-4 overflow-hidden">
          {platform.id === 'google' && output.type === 'ads' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs font-medium text-gray-500">Google Ads Preview</div>
                <div className="ml-auto text-[10px] text-green-600 font-medium flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                </div>
              </div>
              {showOutput && (output as any).ads?.map((ad: any, i: number) => (
                <div key={i} className={`p-3 border border-gray-100 rounded-lg transition-all duration-500 ${showOutput ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${i * 200}ms` }}>
                  <div className="text-[10px] text-green-700 mb-1">Ad</div>
                  <div className="text-sm font-medium text-blue-700">{ad.headline}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{ad.desc}</div>
                  <div className="flex gap-3 mt-2 text-[10px] text-gray-400">
                    <span>CTR: <span className="text-green-600 font-medium">{ad.ctr}</span></span>
                    <span>CPC: <span className="text-blue-600 font-medium">{ad.cpc}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {platform.id === 'meta' && output.type === 'campaign' && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-3">Meta Ads Manager</div>
              {showOutput && (
                <div className="space-y-3 transition-all duration-700">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="text-sm font-semibold text-gray-900">{(output as any).name}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Campaign Objective: Lead Generation</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Audience', value: (output as any).audience, icon: Users },
                      { label: 'Budget', value: (output as any).budget, icon: DollarSign },
                      { label: 'Est. Leads', value: (output as any).estLeads, icon: TrendingUp },
                      { label: 'ROAS', value: (output as any).roas, icon: Eye },
                    ].map((m) => (
                      <div key={m.label} className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <m.icon className="w-3 h-3 text-blue-500 mb-1" />
                        <div className="text-[10px] text-gray-500">{m.label}</div>
                        <div className="text-xs font-semibold text-gray-900">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {platform.id === 'linkedin' && output.type === 'linkedin-post' && (
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600" />
                <div>
                  <div className="text-xs font-semibold text-gray-900">Your Company</div>
                  <div className="text-[10px] text-gray-500">Just now</div>
                </div>
              </div>
              {showOutput && (
                <div className="transition-all duration-700">
                  <p className="text-[11px] text-gray-700 whitespace-pre-line leading-relaxed">{(output as any).text?.substring(0, 250)}...</p>
                  <div className="flex gap-4 mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
                    <span>{(output as any).metrics?.impressions} impressions</span>
                    <span>{(output as any).metrics?.reactions} reactions</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {platform.id === 'facebook' && output.type === 'fb-post' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500" />
                <div>
                  <div className="text-xs font-semibold text-gray-900">Your Page</div>
                  <div className="text-[10px] text-gray-500">Just now - Public</div>
                </div>
              </div>
              {showOutput && (
                <div className="transition-all duration-700">
                  <p className="text-[11px] text-gray-700 whitespace-pre-line leading-relaxed">{(output as any).text?.substring(0, 200)}...</p>
                  <div className="mt-3 p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="text-[10px] font-medium text-blue-700">Boost this post</div>
                    <div className="text-[10px] text-gray-500">Est. reach: {(output as any).boost?.reach} people | {(output as any).boost?.budget} for {(output as any).boost?.duration}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </LaptopMockup>
    );
  };

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 bg-gray-950 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <div className={`text-center mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6">
            <Zap className="w-4 h-4 text-pink-400" />
            <span className="text-sm text-pink-400 font-medium">Live AI Workflows</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Watch AI Transform
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-500"> Every Platform</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            See real AI-generated content, ads, and campaigns - each platform gets its own intelligent automation pipeline
          </p>
        </div>

        {/* Platform Tabs */}
        <div className={`flex flex-wrap justify-center gap-2 md:gap-3 mb-12 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {platforms.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(i)}
              className={`flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-xl font-medium text-sm transition-all duration-300 border ${
                activePlatform === i
                  ? `bg-gradient-to-r ${p.color} text-white border-transparent shadow-lg shadow-white/5 scale-105`
                  : 'bg-gray-900/50 text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-200'
              }`}
            >
              {p.icon}
              <span className="hidden sm:inline">{p.name}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className={`max-w-6xl mx-auto transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Device Mockup */}
            <div className={`transition-all duration-700 ${showOutput ? 'opacity-100 translate-x-0' : 'opacity-50 -translate-x-4'}`}>
              {renderDeviceContent()}
            </div>

            {/* Right: AI Workflow */}
            <div className="space-y-6">
              {/* Input */}
              <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-blue-400">{platform.input.label}</span>
                </div>
                <p className="text-sm text-gray-300 italic">{platform.input.text}</p>
              </div>

              {/* AI Processing */}
              <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-medium text-orange-400">AI Processing</span>
                  <div className="ml-auto flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: `${d * 300}ms` }} />
                    ))}
                  </div>
                </div>
                <AIProcessing steps={platform.aiSteps} isActive={isVisible} />
              </div>

              {/* Output Summary */}
              <div className={`p-4 rounded-xl border border-green-500/20 bg-green-500/5 transition-all duration-700 ${showOutput ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-medium text-green-400">Output Ready</span>
                </div>
                <p className="text-sm text-gray-300">
                  {platform.id === 'google' && 'Generated 3 high-performing ad variations with predicted CTR above 3.8%'}
                  {platform.id === 'instagram' && 'Post created with AI caption, 5 targeted hashtags, scheduled for peak engagement time'}
                  {platform.id === 'meta' && 'Campaign configured with lookalike audience, A/B creatives, and automated budget optimization'}
                  {platform.id === 'linkedin' && 'Professional thought leadership post optimized for maximum reach and engagement'}
                  {platform.id === 'facebook' && 'Community post with event details and smart boost targeting within 15-mile radius'}
                </p>
              </div>

              {/* Progress timer */}
              <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${platform.color}`}
                  style={{
                    animation: 'progressFill 8s linear infinite',
                  }}
                  key={activePlatform}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </section>
  );
}
