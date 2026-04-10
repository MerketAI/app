'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Globe, Zap, Target, Shield } from 'lucide-react';

// Integration tools with SVG icons
const integrationTools = [
  { name: 'Salesforce', cat: 'CRM', x: 8, y: 18, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><path fill="#00A1E0" d="M10.05 4.21a4.49 4.49 0 0 1 3.81-2.12c1.74 0 3.27 1 4.04 2.49a4.94 4.94 0 0 1 1.97-.41c2.73 0 4.95 2.22 4.95 4.95a4.95 4.95 0 0 1-4.95 4.95c-.35 0-.69-.04-1.02-.11a3.72 3.72 0 0 1-3.3 2.01 3.7 3.7 0 0 1-1.6-.37 4.49 4.49 0 0 1-4.15 2.77c-2 0-3.72-1.31-4.32-3.13a3.97 3.97 0 0 1-.56.04A3.97 3.97 0 0 1 .93 11.3 3.97 3.97 0 0 1 4.9 7.34a4.47 4.47 0 0 1 5.15-3.13z"/></svg> },
  { name: 'HubSpot', cat: 'CRM', x: 22, y: 10, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><path fill="#FF7A59" d="M16.75 7.42V4.48a2.08 2.08 0 0 0 1.2-1.88 2.09 2.09 0 1 0-4.18 0c0 .83.49 1.54 1.2 1.88v2.94a5.53 5.53 0 0 0-2.8 1.44L5.18 3.82a2.34 2.34 0 0 0 .07-.56 2.29 2.29 0 1 0-2.29 2.29c.38 0 .74-.1 1.06-.27l6.88 4.98a5.56 5.56 0 0 0-.04 7.17l-2.07 2.07a1.72 1.72 0 0 0-.5-.08 1.76 1.76 0 1 0 1.76 1.76 1.72 1.72 0 0 0-.08-.5l2.04-2.04a5.56 5.56 0 1 0 4.74-11.22z"/></svg> },
  { name: 'Zoho', cat: 'CRM', x: 15, y: 32, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><rect fill="#D32F2F" rx="3" width="24" height="24"/><text x="5" y="16" fill="white" fontSize="9" fontWeight="bold">Z</text></svg> },
  { name: 'Mailchimp', cat: 'Email', x: 35, y: 14, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><circle cx="12" cy="12" r="12" fill="#FFE01B"/><text x="7" y="16" fontSize="10">🐵</text></svg> },
  { name: 'SendGrid', cat: 'Email', x: 42, y: 30, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><rect fill="#1A82E2" rx="3" width="24" height="24"/><path d="M8 8h4v4H8zM12 12h4v4h-4zM8 16h4v4H8z" fill="white" opacity=".9"/></svg> },
  { name: 'Google Ads', cat: 'Ads', x: 55, y: 10, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><circle cx="12" cy="18" r="3" fill="#FBBC04"/><path d="M3.6 21l8.4-14.4 3 5.1L6.6 21z" fill="#4285F4"/><path d="M20.4 21L12 6.6 15 1.5l8.4 14.4z" fill="#34A853"/></svg> },
  { name: 'Meta Ads', cat: 'Ads', x: 62, y: 24, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><path fill="#0668E1" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg> },
  { name: 'Instagram', cat: 'Social', x: 75, y: 12, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><defs><linearGradient id="ig2" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#F58529"/><stop offset=".5" stopColor="#DD2A7B"/><stop offset="1" stopColor="#8134AF"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig2)"/><circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="1.5"/><circle cx="17" cy="7" r="1" fill="white"/></svg> },
  { name: 'LinkedIn', cat: 'Social', x: 83, y: 27, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><rect fill="#0A66C2" rx="3" width="24" height="24"/><path d="M8.5 10v7h-2v-7h2zm-1-3.25a1.17 1.17 0 110 2.35 1.17 1.17 0 010-2.35zM17.5 17h-2v-3.4c0-1.1-.5-1.6-1.25-1.6-.8 0-1.25.55-1.25 1.6V17h-2v-7h2v1s.65-1.2 2-1.2c1.4 0 2.5.85 2.5 2.7V17z" fill="white"/></svg> },
  { name: 'TikTok', cat: 'Social', x: 90, y: 14, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><rect fill="#010101" rx="3" width="24" height="24"/><path d="M16.5 5.5c-.6-.7-1-1.6-1-2.5h-2.7v12.2c0 1.3-1 2.3-2.3 2.3s-2.3-1-2.3-2.3 1-2.3 2.3-2.3c.2 0 .5 0 .7.1V10c-2.7-.2-5 2-5 4.7S8.5 19.5 11 19.5s4.5-2 4.5-4.5V9.5c1 .7 2.2 1 3.5 1V8c-1 0-1.8-.4-2.5-1v-.5z" fill="white"/></svg> },
  { name: 'Zapier', cat: 'Automation', x: 28, y: 44, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><rect fill="#FF4A00" rx="12" width="24" height="24"/><path d="M15 9l-3 3-3-3M15 15l-3-3-3 3" stroke="white" strokeWidth="1.5" fill="none"/></svg> },
  { name: 'Pipedrive', cat: 'CRM', x: 48, y: 46, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><circle cx="12" cy="12" r="12" fill="#017737"/><text x="7" y="17" fill="white" fontSize="11" fontWeight="bold">P</text></svg> },
  { name: 'Make', cat: 'Automation', x: 68, y: 44, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><rect fill="#6D00CC" rx="3" width="24" height="24"/><circle cx="8" cy="12" r="2.5" fill="white"/><circle cx="16" cy="12" r="2.5" fill="white"/><path d="M10.5 12h3" stroke="white" strokeWidth="1.5"/></svg> },
  { name: 'GA4', cat: 'Analytics', x: 12, y: 50, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><path fill="#E37400" d="M22 12A10 10 0 1112 2a10 10 0 0110 10z" opacity=".3"/><rect x="5" y="14" width="3" height="6" rx="1" fill="#E37400"/><rect x="10.5" y="10" width="3" height="10" rx="1" fill="#F9AB00"/><rect x="16" y="6" width="3" height="14" rx="1" fill="#E37400"/></svg> },
  { name: 'Stripe', cat: 'Payment', x: 86, y: 42, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><rect fill="#635BFF" rx="3" width="24" height="24"/><path d="M11.5 8.5c0-.6.5-.9 1.2-.9.8 0 1.8.3 2.5.7V6c-.8-.3-1.6-.5-2.5-.5-2 0-3.4 1.1-3.4 2.9 0 2.8 3.9 2.4 3.9 3.6 0 .7-.6 1-1.4 1-.9 0-2-.4-2.8-.9v2.4c1 .4 1.9.6 2.8.6 2.1 0 3.5-1 3.5-2.9 0-3.1-3.8-2.5-3.8-3.7z" fill="white"/></svg> },
  { name: 'WordPress', cat: 'CMS', x: 38, y: 34, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><circle cx="12" cy="12" r="12" fill="#21759B"/><text x="6" y="17" fill="white" fontSize="12" fontWeight="bold">W</text></svg> },
  { name: 'Shopify', cat: 'Commerce', x: 58, y: 37, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><path fill="#96BF48" d="M20.5 5.8l-.7 5.3s-.6-.3-1.4-.3c-1.1 0-1.2.7-1.2 1 0 1 2.6 1.4 2.6 3.8 0 1.9-1.2 3.1-2.8 3.1-1.9 0-2.9-1.2-2.9-1.2l.5-1.7s1 .9 1.9.9c.6 0 .8-.5.8-.8 0-1.3-2.1-1.4-2.1-3.6 0-1.8 1.3-3.6 4-3.6.7 0 1.3.1 1.3.1z"/><path fill="#5E8E3E" d="M15.5 1.9L14 2.4c-.2-.7-.5-1.2-.8-1.5-.5-.4-1-.4-1.2-.4h-.2l-.2-.3C11.2 0 10.8 0 10.5 0 9 .1 7.5 1.7 6.5 3.9c-.7 1.5-1.2 3.4-1.4 4.3l-2.9.9C1.5 9.3 1.5 9.4 1.4 10L0 20.5l15 2.6.5-21.2z"/></svg> },
  { name: 'Slack', cat: 'Comms', x: 78, y: 37, icon: <svg viewBox="0 0 24 24" className="w-7 h-7"><path fill="#E01E5A" d="M5.04 15.2a1.96 1.96 0 01-1.96 1.96A1.96 1.96 0 011.12 15.2a1.96 1.96 0 011.96-1.96h1.96v1.96z"/><path fill="#36C5F0" d="M15.2 5.04V3.08a1.96 1.96 0 013.92 0 1.96 1.96 0 01-1.96 1.96H15.2z"/><path fill="#2EB67D" d="M8.8 18.96v1.96a1.96 1.96 0 01-3.92 0 1.96 1.96 0 011.96-1.96H8.8z"/><path fill="#ECB22E" d="M18.96 8.8h1.96a1.96 1.96 0 010 3.92 1.96 1.96 0 01-1.96-1.96V8.8z"/></svg> },
];

export function IntegrationsCanvasSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const catColors: Record<string, string> = {
    CRM: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    Email: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    Ads: 'text-green-400 border-green-500/30 bg-green-500/10',
    Social: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    Automation: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    Analytics: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    CMS: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    Commerce: 'text-lime-400 border-lime-500/30 bg-lime-500/10',
    Payment: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    Comms: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  };

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 bg-[#07070d] overflow-hidden">
      {/* Canvas dots background */}
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
            Connect with 50+ CRMs, platforms, and automation tools. Build custom workflows like n8n - your marketing, your rules.
          </p>
        </div>

        {/* Category Filter */}
        <div className={`flex flex-wrap justify-center gap-2 mb-10 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => setActiveCategory(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!activeCategory ? 'bg-white/10 text-white border-white/20' : 'text-gray-500 border-gray-800 hover:border-gray-600'}`}>All</button>
          {['CRM', 'Ads', 'Social', 'Automation', 'Email', 'Analytics'].map((c) => (
            <button key={c} onClick={() => setActiveCategory(activeCategory === c ? null : c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activeCategory === c ? catColors[c] : 'text-gray-500 border-gray-800 hover:border-gray-600'}`}>{c}</button>
          ))}
        </div>

        {/* Canvas */}
        <div className={`relative w-full aspect-[2/1] md:aspect-[3/1] rounded-2xl border border-gray-800/50 bg-gray-950/50 overflow-hidden transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {/* Center Hub */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                <Sparkles className="w-9 h-9 md:w-11 md:h-11 text-white" />
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-[10px] font-bold text-orange-400">MarketAI Hub</span>
              </div>
              <div className="absolute inset-0 rounded-2xl border-2 border-orange-500/20 animate-ping" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
            {integrationTools.map((tool, i) => {
              const filtered = activeCategory && tool.cat !== activeCategory;
              const hovered = hoveredTool === tool.name;
              return (
                <line key={`l-${i}`} x1="50%" y1="50%" x2={`${tool.x}%`} y2={`${tool.y}%`}
                  stroke={hovered ? '#f97316' : '#ffffff'}
                  strokeWidth={hovered ? '2' : '1'}
                  strokeDasharray="6 4"
                  className={`transition-all duration-500 ${filtered ? 'opacity-[0.03]' : hovered ? 'opacity-60' : 'opacity-[0.08]'}`}
                />
              );
            })}
          </svg>

          {/* Tool Nodes with Icons */}
          {integrationTools.map((tool, i) => {
            const filtered = activeCategory && tool.cat !== activeCategory;
            const hovered = hoveredTool === tool.name;
            return (
              <div
                key={tool.name}
                className={`absolute z-20 transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'} ${filtered ? '!opacity-[0.08]' : ''}`}
                style={{ left: `${tool.x}%`, top: `${tool.y}%`, transform: 'translate(-50%, -50%)', transitionDelay: `${200 + i * 60}ms` }}
                onMouseEnter={() => setHoveredTool(tool.name)}
                onMouseLeave={() => setHoveredTool(null)}
              >
                <div className={`relative cursor-pointer group transition-transform duration-300 ${hovered ? 'scale-125' : ''}`}>
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center border bg-gray-900/90 backdrop-blur transition-all duration-300 ${hovered ? 'border-orange-500/50 shadow-lg shadow-orange-500/20' : 'border-gray-700/50'}`}>
                    {tool.icon}
                  </div>
                  {/* Name tooltip */}
                  <div className={`absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[9px] md:text-[10px] px-2 py-0.5 rounded bg-gray-800/90 text-white border border-gray-700 font-medium">{tool.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Cards */}
        <div className={`grid md:grid-cols-3 gap-4 mt-10 transition-all duration-700 delay-[800ms] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {[
            { icon: Zap, color: 'purple', title: 'REST API Access', desc: 'Full API docs. Build custom integrations with any platform.' },
            { icon: Target, color: 'orange', title: 'Workflow Builder', desc: 'Drag-and-drop workflows like n8n. Connect triggers and actions.' },
            { icon: Shield, color: 'green', title: 'Enterprise Ready', desc: 'SSO, webhooks, custom domains. Deploy on your infrastructure.' },
          ].map((card) => (
            <div key={card.title} className="p-5 rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur hover:border-gray-700 transition-colors">
              <div className={`w-10 h-10 rounded-lg bg-${card.color}-500/10 flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 text-${card.color}-400`} />
              </div>
              <h4 className="text-white font-semibold mb-1">{card.title}</h4>
              <p className="text-gray-500 text-sm">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
