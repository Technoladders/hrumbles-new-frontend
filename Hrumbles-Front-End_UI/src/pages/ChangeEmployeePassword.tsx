import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { fetchUsers, changeUserPassword } from './authFunctions';

interface User {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface AuthState {
  user: any;
  role: string | null;
  permissions: string[];
  organization_id: string | null;
  loading: boolean;
  error: string | null;
}

const ChangeEmployeePassword = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Get auth state from Redux
  const { role, permissions } = useSelector((state: { auth: AuthState }) => state.auth);

  // Check if user has admin permission
  const hasAdminPermission = role === 'organization_superadmin' || permissions.includes('manage_users');

  // Fetch users on mount
  useEffect(() => {
    if (!hasAdminPermission) {
      toast.error('You do not have permission to change passwords');
      return;
    }

    const loadUsers = async () => {
      try {
        setFetchingUsers(true);
        const fetchedUsers = await fetchUsers();
        setUsers(fetchedUsers);
      } catch (error: any) {
        toast.error(error.message || 'Failed to load users');
      } finally {
        setFetchingUsers(false);
      }
    };
    loadUsers();
  }, [hasAdminPermission]);

  // Validate password
  const validatePassword = (password: string, confirm: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (password !== confirm) {
      return 'Passwords do not match';
    }
    return null;
  };

  // Handle password change
  const handleChangePassword = async () => {
    setLoading(true);
    setPasswordError(null);

    try {
      await changeUserPassword(selectedUserId, newPassword);
      toast.success(`Password changed successfully for user: ${users.find((u) => u.id === selectedUserId)?.email || selectedUserId}`);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUserId('');
      setIsConfirmDialogOpen(false);
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePassword(newPassword, confirmPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  if (!hasAdminPermission) {
    return (
      <div className="container mx-auto py-8 text-center text-gray-600 dark:text-gray-400">
        Unauthorized: You do not have permission to access this feature.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
            <Lock className="h-6 w-6 mr-2 text-purple-500 dark:text-purple-400" />
            Change User Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Selection */}
            <div>
              <Label htmlFor="user-select" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Select User
              </Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={fetchingUsers || loading}
              >
                <SelectTrigger id="user-select" className="mt-1">
                  <SelectValue placeholder={fetchingUsers ? 'Loading users...' : 'Select a user'} />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 && !fetchingUsers && (
                    <SelectItem value="no-users" disabled>
                      No users found
                    </SelectItem>
                  )}
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* New Password */}
            <div>
              <Label htmlFor="new-password" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="mt-1"
                disabled={loading}
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Confirm Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-1"
                disabled={loading}
                required
              />
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="text-sm text-red-500 dark:text-red-400">{passwordError}</div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-purple-500 hover:bg-purple-600 text-white"
              disabled={loading || fetchingUsers}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Password Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the password for{' '}
              {users.find((u) => u.id === selectedUserId)?.email || selectedUserId}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChangeEmployeePassword;