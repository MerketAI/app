'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,
  Package,
  Briefcase,
  Users,
  Target,
  Settings,
  BarChart3,
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard/business', icon: Building2 },
  { name: 'Products', href: '/dashboard/business/products', icon: Package },
  { name: 'Services', href: '/dashboard/business/services', icon: Briefcase },
  { name: 'Competitors', href: '/dashboard/business/competitors', icon: Target },
  { name: 'Target Audiences', href: '/dashboard/business/audiences', icon: Users },
  { name: 'Brand & Voice', href: '/dashboard/business/brand', icon: Settings },
];

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Business Intelligence</h1>
        <p className="text-gray-600">
          Configure your business profile for better AI-powered content and market insights
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-lg shadow p-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard/business' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Stats */}
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Profile Completeness
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Business Profile</span>
                  <span>--%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Complete your business profile to get better content recommendations
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
