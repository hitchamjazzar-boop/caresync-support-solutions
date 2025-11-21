import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Control, UseFormWatch } from 'react-hook-form';

interface AnnouncementTargetingFieldsProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  employees: { id: string; full_name: string; department: string | null }[];
  departments: string[];
}

export function AnnouncementTargetingFields({
  control,
  watch,
  employees,
  departments,
}: AnnouncementTargetingFieldsProps) {
  const targetType = watch('target_type');

  return (
    <>
      <FormField
        control={control}
        name="target_type"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Who can see this announcement?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-col space-y-1"
              >
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="all" />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Everyone
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="specific_users" />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Specific Users
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="roles" />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Specific Roles
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="departments" />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Specific Departments
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {targetType === 'specific_users' && (
        <FormField
          control={control}
          name="target_users"
          render={() => (
            <FormItem>
              <FormLabel>Select Users</FormLabel>
              <ScrollArea className="h-48 rounded-md border p-4">
                {employees.map((employee) => (
                  <FormField
                    key={employee.id}
                    control={control}
                    name="target_users"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(employee.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              field.onChange(
                                checked
                                  ? [...current, employee.id]
                                  : current.filter((id: string) => id !== employee.id)
                              );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {employee.full_name}
                          {employee.department && (
                            <span className="text-muted-foreground text-xs ml-2">
                              ({employee.department})
                            </span>
                          )}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </ScrollArea>
              <FormDescription>
                Select which users can see this announcement
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {targetType === 'roles' && (
        <FormField
          control={control}
          name="target_roles"
          render={() => (
            <FormItem>
              <FormLabel>Select Roles</FormLabel>
              <div className="space-y-2 border rounded-md p-4">
                {['admin', 'manager', 'employee'].map((role) => (
                  <FormField
                    key={role}
                    control={control}
                    name="target_roles"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(role)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              field.onChange(
                                checked
                                  ? [...current, role]
                                  : current.filter((r: string) => r !== role)
                              );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal capitalize cursor-pointer">
                          {role}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormDescription>
                Select which roles can see this announcement
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {targetType === 'departments' && (
        <FormField
          control={control}
          name="target_departments"
          render={() => (
            <FormItem>
              <FormLabel>Select Departments</FormLabel>
              <ScrollArea className="h-32 rounded-md border p-4">
                {departments.map((dept) => (
                  <FormField
                    key={dept}
                    control={control}
                    name="target_departments"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(dept)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              field.onChange(
                                checked
                                  ? [...current, dept]
                                  : current.filter((d: string) => d !== dept)
                              );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {dept}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </ScrollArea>
              <FormDescription>
                Select which departments can see this announcement
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
