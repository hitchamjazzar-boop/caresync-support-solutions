-- Create admin_permissions table for granular access control
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_type text NOT NULL,
  granted_by uuid REFERENCES public.profiles(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_type)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Admins can manage all permissions"
ON public.admin_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.admin_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Create a function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Full admins have all permissions
  SELECT 
    has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.admin_permissions
      WHERE user_id = _user_id
        AND permission_type = _permission
    )
$$;

-- Add comment for clarity
COMMENT ON TABLE public.admin_permissions IS 'Stores granular permissions for users with limited admin access';