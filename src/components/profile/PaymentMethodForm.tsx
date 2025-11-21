import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wallet, Smartphone, Building2, Landmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const PHILIPPINE_BANKS = {
  traditional: [
    'BDO (Banco de Oro)',
    'BPI (Bank of the Philippine Islands)',
    'Metrobank',
    'UnionBank',
    'Landbank',
    'PNB (Philippine National Bank)',
    'Security Bank',
    'RCBC (Rizal Commercial Banking Corporation)',
    'Chinabank',
    'EastWest Bank',
    'PSBank',
    'AUB (Asia United Bank)',
    'Maybank',
    'UCPB (United Coconut Planters Bank)',
    'BankCom (Bank of Commerce)',
    'PBCom (Philippine Bank of Communications)',
    'Robinsons Bank',
    'Sterling Bank',
  ],
  digital: [
    'CIMB Bank',
    'ING Bank',
    'Tonik Digital Bank',
    'GoTyme Bank',
    'UNO Digital Bank',
    'Maya Bank',
    'Seabank',
  ],
  ewallet: [
    'GCash',
    'Maya (PayMaya)',
    'GrabPay',
    'ShopeePay',
    'PayPal',
  ],
};

export const PaymentMethodForm = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    paymentMethod: 'bank_account',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    routingNumber: '',
  });

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'e_wallet':
        return <Smartphone className="h-4 w-4" />;
      case 'digital_bank':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Landmark className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchPaymentInfo();
  }, [user]);

  const fetchPaymentInfo = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('payment_method, bank_name, account_holder_name, account_number, routing_number')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          paymentMethod: data.payment_method || 'bank_account',
          bankName: data.bank_name || '',
          accountHolderName: data.account_holder_name || '',
          accountNumber: data.account_number || '',
          routingNumber: data.routing_number || '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching payment info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          payment_method: formData.paymentMethod,
          bank_name: formData.bankName,
          account_holder_name: formData.accountHolderName,
          account_number: formData.accountNumber,
          routing_number: formData.routingNumber,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Payment Method Updated',
        description: 'Your payment information has been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update payment method',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <CardTitle>Payment Method</CardTitle>
        </div>
        <CardDescription>
          Add your payment details to receive salary payments via bank transfer, digital bank, or e-wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Type</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value, bankName: '' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_account">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4" />
                    Traditional Bank Account
                  </div>
                </SelectItem>
                <SelectItem value="digital_bank">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Digital Bank
                  </div>
                </SelectItem>
                <SelectItem value="e_wallet">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    E-Wallet
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">
              {formData.paymentMethod === 'e_wallet' ? 'E-Wallet Provider' : 
               formData.paymentMethod === 'digital_bank' ? 'Digital Bank' : 'Bank Name'}
            </Label>
            <Select
              value={formData.bankName}
              onValueChange={(value) => setFormData({ ...formData, bankName: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  formData.paymentMethod === 'e_wallet' ? 'Select e-wallet' :
                  formData.paymentMethod === 'digital_bank' ? 'Select digital bank' :
                  'Select bank'
                } />
              </SelectTrigger>
              <SelectContent>
                {formData.paymentMethod === 'e_wallet' && 
                  PHILIPPINE_BANKS.ewallet.map((wallet) => (
                    <SelectItem key={wallet} value={wallet}>
                      {wallet}
                    </SelectItem>
                  ))
                }
                {formData.paymentMethod === 'digital_bank' && 
                  PHILIPPINE_BANKS.digital.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))
                }
                {formData.paymentMethod === 'bank_account' && 
                  PHILIPPINE_BANKS.traditional.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolderName">Account Holder Name</Label>
            <Input
              id="accountHolderName"
              placeholder="Name on the account"
              value={formData.accountHolderName}
              onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">
                {formData.paymentMethod === 'e_wallet' ? 'Mobile Number' : 'Account Number'}
              </Label>
              <Input
                id="accountNumber"
                type="password"
                placeholder={formData.paymentMethod === 'e_wallet' ? '+63 ••• ••• ••••' : '••••••••••••'}
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              />
            </div>
            {formData.paymentMethod === 'bank_account' && (
              <div className="space-y-2">
                <Label htmlFor="routingNumber">Branch Code (Optional)</Label>
                <Input
                  id="routingNumber"
                  placeholder="Branch code"
                  value={formData.routingNumber}
                  onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                />
              </div>
            )}
          </div>

          {formData.paymentMethod === 'e_wallet' && (
            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">For E-Wallet payments:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Enter your registered mobile number</li>
                <li>Ensure your account is verified and active</li>
                <li>For GCash/Maya, use the format: +639XXXXXXXXX</li>
              </ul>
            </div>
          )}

          {formData.paymentMethod === 'digital_bank' && (
            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">For Digital Bank payments:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Your account number may differ from traditional banks</li>
                <li>Check your digital bank app for the correct account number</li>
                <li>Ensure your account is fully verified</li>
              </ul>
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Payment Method'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};