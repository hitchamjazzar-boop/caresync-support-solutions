import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Clock, FileText, BarChart3, Calendar, DollarSign, User, Megaphone, Network, Mail, MessageSquare, ImageIcon, Vote, Award, Gift } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import logo from '@/assets/logo.png';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { NotificationBell } from '@/components/announcements/NotificationBell';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';
import { NavLink } from '@/components/NavLink';

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
    { name: 'Celebration Gallery', href: '/announcement-gallery', icon: ImageIcon },
    { name: 'Employee Voting', href: '/voting', icon: Vote },
    { name: 'Secret Santa', href: '/secret-santa', icon: Gift },
    { name: 'My Achievements', href: '/profile#achievements', icon: Award },
    { name: 'Manage Achievements', href: '/achievements', icon: Award, adminOnly: true },
    { name: 'Memo Analytics', href: '/memo-analytics', icon: Mail, adminOnly: true },
    { name: 'Org Chart', href: '/org-chart', icon: Network },
    { name: 'Employees', href: '/employees', icon: Users, adminOnly: true },
    { name: 'My Memos', href: '/memos', icon: Mail },
    { name: 'Attendance', href: '/attendance', icon: Clock },
    { name: 'Schedules', href: '/schedules', icon: Calendar },
    { name: 'EOD Reports', href: '/reports', icon: FileText },
    { name: 'Payroll', href: '/payroll', icon: DollarSign },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  ];

  const AppSidebar = () => {
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

    return (
      <Sidebar collapsible="icon" className="border-r">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 py-4">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Care Sync" className="h-6 w-6" />
                {!isCollapsed && (
                  <div>
                    <h2 className="text-sm font-semibold">Care Sync</h2>
                    <p className="text-xs text-muted-foreground">Support Solutions</p>
                  </div>
                )}
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive} className="h-12 touch-manipulation">
                          <NavLink to={item.href} activeClassName="bg-accent text-accent-foreground">
                            <Icon className="h-5 w-5 shrink-0" />
                            {!isCollapsed && <span>{item.name}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <AppSidebar />

        <div className="flex flex-1 flex-col w-full">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex h-14 sm:h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <SidebarTrigger className="h-10 w-10 touch-manipulation" />
                <img src={logo} alt="Care Sync" className="h-8 sm:h-10 md:hidden" />
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full touch-manipulation">
                      <ProfileAvatarWithBadges
                        userId={user?.id || ''}
                        photoUrl={profilePhoto}
                        fullName={fullName || 'User'}
                        className="h-10 w-10"
                      />
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

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
