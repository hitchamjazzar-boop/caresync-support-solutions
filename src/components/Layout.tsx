import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Clock, FileText, BarChart3, Calendar, DollarSign, User, Megaphone, Network, Mail, MessageSquare, ImageIcon, Vote, Award, Gift, Home, ChevronRight, Settings, Receipt, Heart, type LucideIcon } from 'lucide-react';
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import logo from '@/assets/logo.png';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { NotificationBell } from '@/components/announcements/NotificationBell';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';
import { NavLink } from '@/components/NavLink';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
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

  const mainNavigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'My Achievements', href: '/profile#achievements', icon: Award },
    { name: 'Attendance', href: '/attendance', icon: Clock },
    { name: 'EOD Reports', href: '/reports', icon: FileText },
    { name: 'Payroll', href: '/payroll', icon: DollarSign },
    { name: 'My Invoices', href: '/invoices', icon: Receipt },
    { name: 'Announcements', href: '/announcements', icon: Megaphone, adminOnly: true },
    { name: 'Celebration Gallery', href: '/announcement-gallery', icon: ImageIcon },
    { name: 'Employee Voting', href: '/voting', icon: Vote },
    { name: 'Secret Santa', href: '/secret-santa', icon: Gift },
    { name: 'Org Chart', href: '/org-chart', icon: Network },
    { name: 'Employees', href: '/employees', icon: Users, adminOnly: true },
    { name: 'My Memos', href: '/memos', icon: Mail },
    { name: 'Shout Outs', href: '/shoutouts', icon: Heart, adminOnly: true },
    { name: 'Schedules', href: '/schedules', icon: Calendar },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  ];

  const settingsNavigation: NavigationItem[] = [
    { name: 'Calendar Settings', href: '/calendar/settings', icon: Settings, adminOnly: true },
    { name: 'Manage Achievements', href: '/achievements', icon: Award, adminOnly: true },
    { name: 'Memo Analytics', href: '/memo-analytics', icon: BarChart3, adminOnly: true },
  ];

  const allNavigation = [...mainNavigation, ...settingsNavigation];

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: Array<{ name: string; href: string; icon?: LucideIcon }> = [
      { name: 'Home', href: '/', icon: Home }
    ];

    if (pathSegments.length === 0) return breadcrumbs;

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const navItem = allNavigation.find(item => item.href === currentPath);
      if (navItem) {
        breadcrumbs.push({ name: navItem.name, href: navItem.href, icon: navItem.icon });
      } else {
        const formattedName = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        breadcrumbs.push({ name: formattedName, href: currentPath });
      }
    });

    return breadcrumbs;
  };

  const AppSidebar = () => {
    const { open } = useSidebar();
    const [settingsOpen, setSettingsOpen] = useState(() => {
      // Check if current route is in settings navigation
      return settingsNavigation.some(item => location.pathname === item.href);
    });

    const filteredMainNav = mainNavigation.filter((item) => !item.adminOnly || isAdmin);
    const filteredSettingsNav = settingsNavigation.filter((item) => !item.adminOnly || isAdmin);
    const hasSettingsItems = filteredSettingsNav.length > 0;

    return (
      <Sidebar collapsible="icon" className="border-r">
        <SidebarContent className="pt-2">
          {/* Main Menu */}
          <SidebarGroup>
            <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMainNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive} 
                        className="h-12 touch-manipulation data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
                        tooltip={item.name}
                      >
                        <NavLink to={item.href}>
                          <Icon className="h-5 w-5 shrink-0" />
                          <span>{item.name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Settings Menu */}
          {hasSettingsItems && (
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </div>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {filteredSettingsNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                          <SidebarMenuItem key={item.name}>
                            <SidebarMenuButton 
                              asChild 
                              isActive={isActive}
                              className="h-10 pl-6 touch-manipulation data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
                              tooltip={item.name}
                            >
                              <NavLink to={item.href}>
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{item.name}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )}
        </SidebarContent>
      </Sidebar>
    );
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <AppSidebar />

        <div className="flex flex-1 flex-col w-full">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex h-14 sm:h-16 items-center justify-between px-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <SidebarTrigger className="h-10 w-10 shrink-0 touch-manipulation" />
                <div className="flex items-center gap-2 min-w-0">
                  <img src={logo} alt="Care Sync" className="h-8 sm:h-10 shrink-0" />
                  <div className="hidden sm:block min-w-0">
                    <h1 className="text-sm sm:text-base font-semibold truncate">Care Sync</h1>
                    <p className="text-xs text-muted-foreground truncate">Support Solutions</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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

          {/* Breadcrumb Navigation */}
          {breadcrumbs.length > 1 && (
            <div className="border-b bg-muted/30 px-4 py-3">
              <div className="mx-auto max-w-7xl">
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => {
                      const isLast = index === breadcrumbs.length - 1;
                      const BreadcrumbIcon = crumb.icon;
                      
                      return (
                        <div key={crumb.href} className="flex items-center">
                          {index > 0 && (
                            <BreadcrumbSeparator>
                              <ChevronRight className="h-4 w-4" />
                            </BreadcrumbSeparator>
                          )}
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage className="flex items-center gap-1.5">
                                {BreadcrumbIcon && <BreadcrumbIcon className="h-4 w-4" />}
                                <span className="max-w-[150px] truncate sm:max-w-none">{crumb.name}</span>
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink 
                                href={crumb.href}
                                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                              >
                                {BreadcrumbIcon && <BreadcrumbIcon className="h-4 w-4" />}
                                <span className="max-w-[150px] truncate sm:max-w-none">{crumb.name}</span>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </div>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
