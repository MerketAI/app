'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Check, Zap, TrendingUp, Users, Eye, MousePointerClick, DollarSign, Heart, MessageCircle, Share2, Bookmark, Send, MoreHorizontal, ThumbsUp, Repeat2 } from 'lucide-react';

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
      text: "Thrilled to share that we've raised $15M in Series B funding! This milestone reflects our team's dedication to transforming how businesses approach marketing automation.\n\nWhat's next:\n\u2192 Tripling our engineering team\n\u2192 Expanding to 12 new markets\n\u2192 Launching AI-powered analytics\n\nGrateful to our investors, team, and 10K+ customers who made this possible.",
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
      text: "This Saturday is going to be AMAZING at the Downtown Farmers Market!\n\nJoin us for:\n\ud83c\udfb6 Live music from local artists\n\ud83e\udd55 30+ farm-fresh vendors\n\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d\udc66 Kid-friendly activities all day\n\nSaturday, 9 AM - 2 PM | Main Street Plaza\nTag someone you'd bring!",
      boost: { reach: '12,400', budget: '$25', duration: '3 days' },
    },
  },
];

// Realistic iPhone mockup
function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[260px] md:w-[300px]">
      <div className="relative rounded-[2.5rem] border-[6px] border-gray-800 bg-gray-900 shadow-[0_0_0_2px_rgba(60,60,67,0.5),0_20px_60px_-10px_rgba(0,0,0,0.5)]">
        {/* Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[90px] h-[24px] bg-black rounded-full z-20" />
        {/* Side button */}
        <div className="absolute -right-[8px] top-[100px] w-[3px] h-[40px] bg-gray-700 rounded-r" />
        <div className="absolute -left-[8px] top-[80px] w-[3px] h-[25px] bg-gray-700 rounded-l" />
        <div className="absolute -left-[8px] top-[115px] w-[3px] h-[40px] bg-gray-700 rounded-l" />
        <div className="absolute -left-[8px] top-[160px] w-[3px] h-[40px] bg-gray-700 rounded-l" />
        {/* Screen */}
        <div className="rounded-[2rem] overflow-hidden bg-white m-[2px]">
          {/* Status bar */}
          <div className="flex justify-between items-center px-6 pt-3 pb-1 text-[9px] font-semibold text-gray-900">
            <span>9:41</span>
            <div className="flex gap-1 items-center">
              <div className="flex gap-[2px]">{[1,2,3,4].map(i=><div key={i} className="w-[3px] h-[3px] rounded-full bg-gray-900"/>)}</div>
              <svg className="w-3 h-3" viewBox="0 0 16 16"><rect x="1" y="4" width="10" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="6" width="2" height="4" rx="0.5" fill="currentColor"/><rect x="2.5" y="5.5" width="7" height="5" rx="0.5" fill="currentColor"/></svg>
            </div>
          </div>
          {children}
        </div>
      </div>
      {/* Bottom indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[120px] h-[4px] bg-gray-800 rounded-full z-20" />
    </div>
  );
}

// Realistic MacBook mockup
function LaptopMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      {/* Screen bezel */}
      <div className="relative rounded-t-2xl bg-gray-800 pt-6 pb-2 px-2 shadow-[0_-2px_20px_rgba(0,0,0,0.3)]">
        {/* Camera + indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <div className="w-[6px] h-[6px] rounded-full bg-gray-600 ring-1 ring-gray-700" />
        </div>
        {/* Screen content */}
        <div className="rounded-lg overflow-hidden bg-white shadow-inner">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200">
            <div className="flex gap-1.5">
              <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
              <div className="w-[10px] h-[10px] rounded-full bg-[#FEBC2E]" />
              <div className="w-[10px] h-[10px] rounded-full bg-[#28C840]" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white rounded-md px-3 py-1 text-[9px] text-gray-400 border border-gray-200 text-center truncate">
                ads.google.com
              </div>
            </div>
          </div>
          {children}
        </div>
      </div>
      {/* Hinge + base */}
      <div className="h-[6px] bg-gradient-to-b from-gray-700 to-gray-600 rounded-b-sm" />
      <div className="h-[12px] bg-gray-600 rounded-b-xl mx-[-8px] shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
        <div className="w-[60px] h-[3px] bg-gray-500 rounded-full mx-auto relative top-[4px]" />
      </div>
    </div>
  );
}

// AI Processing indicator - SLOWER
function AIProcessing({ steps, isActive }: { steps: string[]; isActive: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isActive) { setCurrentStep(0); return; }
    const timer = setInterval(() => {
      setCurrentStep((s) => (s + 1) % steps.length);
    }, 3000); // 3 seconds per step (was 1.5s)
    return () => clearInterval(timer);
  }, [isActive, steps.length]);

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={step} className={`flex items-center gap-3 transition-all duration-700 ${i <= currentStep ? 'opacity-100' : 'opacity-30'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
            i < currentStep ? 'bg-green-500' : i === currentStep ? 'bg-orange-500 animate-pulse' : 'bg-gray-700'
          }`}>
            {i < currentStep ? <Check className="w-3 h-3 text-white" /> : i === currentStep ? <Sparkles className="w-3 h-3 text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />}
          </div>
          <span className={`text-sm ${i <= currentStep ? 'text-gray-700' : 'text-gray-400'}`}>{step}</span>
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

  // Reset output on platform change - SLOWER reveal
  useEffect(() => {
    setShowOutput(false);
    const timer = setTimeout(() => setShowOutput(true), 3500); // 3.5s delay
    return () => clearTimeout(timer);
  }, [activePlatform]);

  // Auto-rotate - MUCH SLOWER (15 seconds)
  useEffect(() => {
    if (!isVisible) return;
    const timer = setInterval(() => {
      setActivePlatform((p) => (p + 1) % platforms.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [isVisible]);

  const platform = platforms[activePlatform];

  const renderDeviceContent = () => {
    const output = platform.output;

    if (platform.id === 'instagram') {
      return (
        <PhoneMockup>
          <div className="h-[380px] md:h-[420px]">
            {/* IG header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <span className="text-[8px] font-bold">YB</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-900">yourbrand</span>
                  <p className="text-[9px] text-gray-500">Sponsored</p>
                </div>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </div>
            {/* Post image */}
            <div className="aspect-square bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <div className="text-center">
                <span className="text-5xl">☕</span>
                <p className="text-xs text-gray-600 mt-2 font-medium">Organic Coffee Blend</p>
              </div>
            </div>
            {/* Actions */}
            <div className="px-3 py-2.5 flex items-center gap-4">
              <Heart className={`w-6 h-6 transition-all duration-500 ${showOutput ? 'text-red-500 fill-red-500 scale-110' : 'text-gray-800'}`} />
              <MessageCircle className="w-6 h-6 text-gray-800" />
              <Send className="w-6 h-6 text-gray-800" />
              <Bookmark className="w-6 h-6 text-gray-800 ml-auto" />
            </div>
            {/* Content */}
            {showOutput && (
              <div className="px-3 animate-fade-in">
                <p className="text-[11px] font-semibold text-gray-900">{(output as any).metrics?.likes} likes</p>
                <p className="text-[11px] text-gray-900 mt-1 leading-relaxed">
                  <span className="font-semibold">yourbrand </span>
                  {(output as any).caption}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(output as any).hashtags?.map((h: string) => (
                    <span key={h} className="text-[10px] text-blue-600">{h}</span>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 uppercase">2 hours ago</p>
              </div>
            )}
          </div>
        </PhoneMockup>
      );
    }

    // Laptop content
    return (
      <LaptopMockup>
        <div className="h-[300px] md:h-[340px] p-4 overflow-hidden">
          {platform.id === 'google' && output.type === 'ads' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {platform.icon}
                  <span className="text-xs font-semibold text-gray-700">Campaign Preview</span>
                </div>
                <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                </span>
              </div>
              {showOutput && (output as any).ads?.map((ad: any, i: number) => (
                <div key={i} className="p-3 border border-gray-100 rounded-lg bg-gray-50/50 transition-all duration-700" style={{ transitionDelay: `${i * 300}ms`, opacity: showOutput ? 1 : 0, transform: showOutput ? 'translateY(0)' : 'translateY(10px)' }}>
                  <div className="text-[9px] text-green-700 font-medium mb-1 flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-green-500" /> Ad {i + 1}
                  </div>
                  <div className="text-[13px] font-medium text-blue-700 hover:underline cursor-pointer">{ad.headline}</div>
                  <div className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{ad.desc}</div>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] text-gray-400">CTR <span className="text-green-600 font-semibold">{ad.ctr}</span></span>
                    <span className="text-[10px] text-gray-400">CPC <span className="text-blue-600 font-semibold">{ad.cpc}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {platform.id === 'meta' && output.type === 'campaign' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                {platform.icon}
                <span className="text-xs font-semibold text-gray-700">Ads Manager</span>
              </div>
              {showOutput && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-100">
                    <div className="text-sm font-semibold text-gray-900">{(output as any).name}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Objective: Lead Generation | Status: Learning</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Audience', value: (output as any).audience, icon: Users, color: 'text-blue-500' },
                      { label: 'Daily Budget', value: (output as any).budget, icon: DollarSign, color: 'text-green-500' },
                      { label: 'Est. Leads/Day', value: (output as any).estLeads, icon: TrendingUp, color: 'text-purple-500' },
                      { label: 'Projected ROAS', value: (output as any).roas, icon: Eye, color: 'text-orange-500' },
                    ].map((m) => (
                      <div key={m.label} className="p-3 rounded-lg bg-white border border-gray-100 shadow-sm">
                        <m.icon className={`w-4 h-4 ${m.color} mb-1.5`} />
                        <div className="text-[10px] text-gray-500">{m.label}</div>
                        <div className="text-sm font-bold text-gray-900">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {platform.id === 'linkedin' && (
            <div>
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">YC</div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">Your Company</div>
                  <div className="text-[10px] text-gray-500">12,450 followers</div>
                  <div className="text-[9px] text-gray-400">Just now</div>
                </div>
              </div>
              {showOutput && (
                <div className="animate-fade-in">
                  <p className="text-[11px] text-gray-700 whitespace-pre-line leading-relaxed">{(output as any).text?.substring(0, 280)}...</p>
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <ThumbsUp className="w-3.5 h-3.5" /> {(output as any).metrics?.reactions}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <MessageCircle className="w-3.5 h-3.5" /> {(output as any).metrics?.comments}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Repeat2 className="w-3.5 h-3.5" /> 47
                    </div>
                    <span className="text-[10px] text-gray-400 ml-auto">{(output as any).metrics?.impressions} views</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {platform.id === 'facebook' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">YP</div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">Your Page</div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-1">Just now <span className="text-gray-400">&#183; Public</span></div>
                </div>
              </div>
              {showOutput && (
                <div className="animate-fade-in">
                  <p className="text-[11px] text-gray-800 whitespace-pre-line leading-relaxed">{(output as any).text}</p>
                  <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                    <div className="text-[11px] font-semibold text-blue-700 mb-1">Boost This Post</div>
                    <div className="text-[10px] text-gray-600">Est. reach: <strong>{(output as any).boost?.reach}</strong> people</div>
                    <div className="text-[10px] text-gray-500">{(output as any).boost?.budget} for {(output as any).boost?.duration}</div>
                  </div>
                  <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> Like</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Comment</span>
                    <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> Share</span>
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
    <section ref={sectionRef} className="relative py-24 lg:py-32 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <div className={`text-center mb-14 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-100 border border-pink-200 mb-6">
            <Zap className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-pink-600 font-medium">Live AI Workflows</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Watch AI Transform
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600"> Every Platform</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real AI-generated content, ads, and campaigns. Each platform gets its own intelligent automation.
          </p>
        </div>

        {/* Platform Tabs */}
        <div className={`flex flex-wrap justify-center gap-2 md:gap-3 mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {platforms.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(i)}
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-medium text-sm transition-all duration-500 border ${
                activePlatform === i
                  ? `bg-gradient-to-r ${p.color} text-white border-transparent shadow-lg scale-105`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:shadow-md'
              }`}
            >
              {p.icon}
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className={`max-w-6xl mx-auto transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: Device Mockup */}
            <div className={`transition-all duration-1000 ${showOutput ? 'opacity-100' : 'opacity-70'}`}>
              {renderDeviceContent()}
            </div>

            {/* Right: AI Workflow */}
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-blue-600">{platform.input.label}</span>
                </div>
                <p className="text-base text-gray-700 italic leading-relaxed">{platform.input.text}</p>
              </div>

              <div className="p-5 rounded-xl border border-orange-200 bg-orange-50/50">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-orange-600">MarketAI Processing</span>
                  <div className="ml-auto flex gap-1.5">
                    {[0, 1, 2].map((d) => (
                      <div key={d} className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: `${d * 400}ms` }} />
                    ))}
                  </div>
                </div>
                <AIProcessing steps={platform.aiSteps} isActive={isVisible} />
              </div>

              <div className={`p-5 rounded-xl border border-green-200 bg-green-50/50 transition-all duration-1000 ${showOutput ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">Output Ready</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {platform.id === 'google' && '3 high-performing ad variations generated with predicted CTR above 3.8% and optimized bidding strategy.'}
                  {platform.id === 'instagram' && 'Post created with AI caption, 5 targeted hashtags, and scheduled for Tuesday 9:15 AM - your peak engagement time.'}
                  {platform.id === 'meta' && 'Full campaign configured with 2.4M lookalike audience, 8 creative variants, and $50/day auto-optimized budget.'}
                  {platform.id === 'linkedin' && 'Professional thought leadership post crafted with engagement hooks and strategic CTAs for maximum B2B reach.'}
                  {platform.id === 'facebook' && 'Community event post with smart boost targeting 12,400 people within 15-mile radius for just $25.'}
                </p>
              </div>

              {/* Progress */}
              <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${platform.color}`} style={{ animation: 'progressFill 15s linear infinite' }} key={activePlatform} />
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
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </section>
  );
}
