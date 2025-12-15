import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Award, Plus, Settings } from 'lucide-react';
import { CreateAchievementTypeDialog } from '@/components/achievements/CreateAchievementTypeDialog';
import { AwardAchievementDialog } from '@/components/achievements/AwardAchievementDialog';
import { AchievementTypesList } from '@/components/achievements/AchievementTypesList';
import { EmployeeAchievementsList } from '@/components/achievements/EmployeeAchievementsList';

interface AchievementType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

const Achievements = () => {
  const { hasPermission, loading: adminLoading } = useAdmin();
  const [achievementTypes, setAchievementTypes] = useState<AchievementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);

  const canManageAchievements = hasPermission('achievements');

  useEffect(() => {
    fetchAchievementTypes();
  }, []);

  const fetchAchievementTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('achievement_types')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setAchievementTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching achievement types:', error);
      toast.error('Failed to load achievement types');
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!canManageAchievements) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need the achievements permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Award className="h-6 sm:h-8 w-6 sm:w-8 text-primary" />
            Employee Achievements
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Manage custom badges and awards for employees
          </p>
        </div>
      </div>

      <Tabs defaultValue="award" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="award" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
            <Award className="h-3 sm:h-4 w-3 sm:w-4" />
            <span className="hidden sm:inline">Award </span>Badges
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
            <Settings className="h-3 sm:h-4 w-3 sm:w-4" />
            <span className="hidden sm:inline">Manage </span>Types
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
            <Award className="h-3 sm:h-4 w-3 sm:w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="award" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg">Award Achievement to Employee</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Recognize outstanding employees with custom badges and awards
                  </CardDescription>
                </div>
                <Button onClick={() => setAwardDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Award Badge
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {achievementTypes.filter(type => type.is_active).map((type) => (
                  <Card key={type.id} className="p-3 sm:p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2 sm:p-3 rounded-lg shrink-0"
                        style={{ backgroundColor: `${type.color}20` }}
                      >
                        <Award className="h-5 sm:h-6 w-5 sm:w-6" style={{ color: type.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{type.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                          {type.description}
                        </p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {type.category}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg">Achievement Types</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Create and manage custom achievement badges
                  </CardDescription>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Type
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <AchievementTypesList
                achievementTypes={achievementTypes}
                onUpdate={fetchAchievementTypes}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Achievement History</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View all achievements awarded to employees
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <EmployeeAchievementsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateAchievementTypeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchAchievementTypes}
      />

      <AwardAchievementDialog
        open={awardDialogOpen}
        onOpenChange={setAwardDialogOpen}
        achievementTypes={achievementTypes.filter(type => type.is_active)}
        onSuccess={() => {
          toast.success('Achievement awarded successfully!');
          setAwardDialogOpen(false);
        }}
      />
    </div>
  );
};

export default Achievements;
