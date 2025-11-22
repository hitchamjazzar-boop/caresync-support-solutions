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
  const { isAdmin } = useAdmin();
  const [achievementTypes, setAchievementTypes] = useState<AchievementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);

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

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            Employee Achievements
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage custom badges and awards for employees
          </p>
        </div>
      </div>

      <Tabs defaultValue="award" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="award" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Award Badges
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage Types
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Achievement History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="award" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Award Achievement to Employee</CardTitle>
                  <CardDescription>
                    Recognize outstanding employees with custom badges and awards
                  </CardDescription>
                </div>
                <Button onClick={() => setAwardDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Award Badge
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievementTypes.filter(type => type.is_active).map((type) => (
                  <Card key={type.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${type.color}20` }}
                      >
                        <Award className="h-6 w-6" style={{ color: type.color }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{type.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Achievement Types</CardTitle>
                  <CardDescription>
                    Create and manage custom achievement badges
                  </CardDescription>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AchievementTypesList
                achievementTypes={achievementTypes}
                onUpdate={fetchAchievementTypes}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Achievement History</CardTitle>
              <CardDescription>
                View all achievements awarded to employees
              </CardDescription>
            </CardHeader>
            <CardContent>
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
