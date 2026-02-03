'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Platform',
    items: [
      { name: 'AI Content Generation', description: 'Create engaging content with AI', href: '#features' },
      { name: 'Smart Scheduling', description: 'Automate your posting schedule', href: '#features' },
      { name: 'Analytics', description: 'Track performance metrics', href: '#features' },
      { name: 'Multi-Platform', description: 'Publish everywhere at once', href: '#platforms' },
    ],
  },
  {
    name: 'Solutions',
    items: [
      { name: 'For Marketers', description: 'Scale your content production', href: '#solutions' },
      { name: 'For Agencies', description: 'Manage multiple clients', href: '#solutions' },
      { name: 'For Enterprises', description: 'Enterprise-grade security', href: '#solutions' },
    ],
  },
  { name: 'Pricing', href: '#pricing' },
  { name: 'Resources', href: '#' },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      )}
    >
      <nav className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold text-gray-900">Jeeper</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item) =>
              'items' in item ? (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(item.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100/50 transition-colors">
                    {item.name}
                    <ChevronDown className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      activeDropdown === item.name && 'rotate-180'
                    )} />
                  </button>

                  {/* Dropdown Menu */}
                  <div className={cn(
                    'absolute top-full left-0 pt-2 transition-all duration-200',
                    activeDropdown === item.name
                      ? 'opacity-100 visible translate-y-0'
                      : 'opacity-0 invisible -translate-y-2'
                  )}>
                    <div className="w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-2 overflow-hidden">
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className="flex flex-col gap-0.5 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-900">{subItem.name}</span>
                          <span className="text-xs text-gray-500">{subItem.description}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100/50 transition-colors"
                >
                  {item.name}
                </Link>
              )
            )}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-700">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6">
                Start free trial
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={cn(
          'lg:hidden overflow-hidden transition-all duration-300',
          mobileMenuOpen ? 'max-h-[500px] pb-6' : 'max-h-0'
        )}>
          <div className="pt-4 space-y-1">
            {navigation.map((item) =>
              'items' in item ? (
                <div key={item.name} className="space-y-1">
                  <div className="px-4 py-2 text-sm font-medium text-gray-500">
                    {item.name}
                  </div>
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className="block px-6 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              )
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2 px-4">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full">Sign in</Button>
            </Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full bg-gray-900 hover:bg-gray-800">Start free trial</Button>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
