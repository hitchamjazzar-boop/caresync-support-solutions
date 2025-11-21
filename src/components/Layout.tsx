import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Clock, FileText, BarChart3, Calendar, DollarSign, User } from 'lucide-react';
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
import logo from '@/assets/logo.png';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');

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
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Attendance', href: '/attendance', icon: Clock },
    { name: 'Schedules', href: '/schedules', icon: Calendar },
    { name: 'EOD Reports', href: '/reports', icon: FileText },
    { name: 'Payroll', href: '/payroll', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Care Sync" className="h-10" />
            <div>
              <h1 className="text-lg font-semibold">Care Sync</h1>
              <p className="text-xs text-muted-foreground">Support Solutions</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
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
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
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
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-r bg-card p-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href}>
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
