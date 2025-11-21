-- Add payment method fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_account',
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS routing_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.payment_method IS 'Payment method type: bank_account, check, etc';
COMMENT ON COLUMN public.profiles.bank_name IS 'Name of the bank';
COMMENT ON COLUMN public.profiles.account_holder_name IS 'Name on the bank account';
COMMENT ON COLUMN public.profiles.account_number IS 'Bank account number (encrypted in production)';
COMMENT ON COLUMN public.profiles.routing_number IS 'Bank routing number';