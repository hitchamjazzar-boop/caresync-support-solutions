import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Clock, FileText, BarChart3, Calendar, DollarSign, User, Menu, X, Megaphone, Network, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import logo from '@/assets/logo.png';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { NotificationBell } from '@/components/announcements/NotificationBell';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }

    // Listen for profile updates
    const handleProfileUpdate = () => {
      fetchUserProfile();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('photo_url, full_name')
      .eq('id', user.id)
      .single();

    if (data) {
      // Add cache busting parameter to force refresh
      const photoUrl = data.photo_url ? `${data.photo_url.split('?')[0]}?t=${Date.now()}` : null;
      setProfilePhoto(photoUrl);
      setFullName(data.full_name);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Announcements', href: '/announcements', icon: Megaphone, adminOnly: true },
    { name: 'Memo Analytics', href: '/memo-analytics', icon: Mail, adminOnly: true },
    { name: 'Org Chart', href: '/org-chart', icon: Network },
    { name: 'Employees', href: '/employees', icon: Users, adminOnly: true },
    { name: 'My Memos', href: '/memos', icon: Mail },
    { name: 'Attendance', href: '/attendance', icon: Clock },
    { name: 'Schedules', href: '/schedules', icon: Calendar },
    { name: 'EOD Reports', href: '/reports', icon: FileText },
    { name: 'Payroll', href: '/payroll', icon: DollarSign },
  ];

  const NavItems = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="space-y-1">
      {navigation
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.name} to={item.href} onClick={onItemClick}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          );
        })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Menu Toggle */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <img src={logo} alt="Care Sync" className="h-8" />
                    <div>
                      <h2 className="text-base font-semibold">Care Sync</h2>
                      <p className="text-xs text-muted-foreground">Support Solutions</p>
                    </div>
                  </div>
                </div>
                <NavItems onItemClick={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>

            <img src={logo} alt="Care Sync" className="h-8 sm:h-10" />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-semibold">Care Sync</h1>
              <p className="text-xs text-muted-foreground">Support Solutions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarImage src={profilePhoto || undefined} />
                    <AvatarFallback>
                      {fullName?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden md:block sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-64 border-r bg-card p-4">
          <NavItems />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
