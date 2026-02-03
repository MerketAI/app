import Link from 'next/link';
import { Sparkles, Twitter, Linkedin, Youtube, Instagram } from 'lucide-react';

const footerLinks = {
  Platform: [
    { name: 'AI Content Generation', href: '#' },
    { name: 'Smart Scheduling', href: '#' },
    { name: 'Analytics Dashboard', href: '#' },
    { name: 'Team Collaboration', href: '#' },
    { name: 'API Access', href: '#' },
  ],
  Solutions: [
    { name: 'For Marketers', href: '#' },
    { name: 'For Agencies', href: '#' },
    { name: 'For Enterprises', href: '#' },
    { name: 'For Startups', href: '#' },
  ],
  Resources: [
    { name: 'Blog', href: '#' },
    { name: 'Help Center', href: '#' },
    { name: 'API Docs', href: '#' },
    { name: 'Community', href: '#' },
    { name: 'Webinars', href: '#' },
  ],
  Company: [
    { name: 'About Us', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Press', href: '#' },
    { name: 'Contact', href: '#' },
    { name: 'Partners', href: '#' },
  ],
};

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: '#' },
  { name: 'LinkedIn', icon: Linkedin, href: '#' },
  { name: 'YouTube', icon: Youtube, href: '#' },
  { name: 'Instagram', icon: Instagram, href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Jeeper</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              Put AI agents to work for your marketing. Generate content, automate campaigns, and grow your business.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                  aria-label={item.name}
                >
                  <item.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Jeeper. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
