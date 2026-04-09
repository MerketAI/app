'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Share2,
  BarChart3,
  Settings,
  LogOut,
  CreditCard,
  User,
  Globe,
  FileCode,
  Newspaper,
  Menu,
  Building2,
  Megaphone,
  Users,
  Mail,
  Palette,
  Video,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Content', href: '/dashboard/content', icon: FileText },
  { name: 'Ads Manager', href: '/dashboard/ads', icon: Megaphone },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'Email', href: '/dashboard/email', icon: Mail },
  { name: 'Designs', href: '/dashboard/designs', icon: Palette },
  { name: 'Videos', href: '/dashboard/videos', icon: Video },
  { name: 'Trends', href: '/dashboard/trends', icon: TrendingUp },
  { name: 'Platforms', href: '/dashboard/platforms', icon: Share2 },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Business', href: '/dashboard/business', icon: Building2 },
];

const workspaceNavigation = [
  { name: 'Workspace', href: '/dashboard/workspace', icon: Globe },
  { name: 'Pages', href: '/dashboard/workspace/pages', icon: FileCode },
  { name: 'Posts', href: '/dashboard/workspace/posts', icon: Newspaper },
  { name: 'Menus', href: '/dashboard/workspace/menus', icon: Menu },
];

const settingsNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, fetchUser, logout } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r">
        <div className="flex flex-col h-full">
          <div className="p-6">
            <Link href="/dashboard" className="text-2xl font-bold text-primary">
              MarketAI
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {/* Main Navigation */}
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}

            {/* Workspace Section */}
            <div className="pt-4 mt-4 border-t">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Website Builder
              </p>
              {workspaceNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Settings */}
            <div className="pt-4 mt-4 border-t">
              {settingsNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Credits section */}
          <div className="p-4 mx-4 mb-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Credits</span>
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">
              {user?.subscription?.creditsRemaining || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {user?.subscription?.tier || 'Starter'} Plan
            </p>
          </div>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
