import React, { useState, useEffect } from 'react';
// We no longer need useLocation, so it's removed from the import.
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const SetPassword = () => {
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isSessionSet, setIsSessionSet] = React.useState(false);
  const navigate = useNavigate();
  // const location = useLocation(); // <- This line is removed.
  const { toast } = useToast();

  React.useEffect(() => {
    const setAuthSession = async () => {
      try {
        // --- THIS IS THE FIX ---
        // Read the hash directly from the browser's window object
        // to avoid race conditions with the React Router.
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        // --- END OF FIX ---
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        const errorDescription = params.get('error_description');
        if (errorDescription) {
          // Replace '+' with spaces for a clean message
          const decodedError = errorDescription.replace(/\+/g, ' ');
          throw new Error(`Link Invalid: ${decodedError}`);
        }

        if (!accessToken) {
          throw new Error('Invalid or missing verification token. Please check the link or request a new one.');
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          throw new Error('Failed to authenticate: ' + sessionError.message);
        }
        
        setIsSessionSet(true);

      } catch (err: any) {
        const errorMessage = err.message || 'Failed to authenticate. Please try again or request a new verification email.';
        setError(errorMessage);
        toast({
          title: 'Authentication Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };

    setAuthSession();
    // The dependency array is updated because `location.hash` is no longer used.
    // The hook will now run only once when the component mounts.
  }, [toast]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSessionSet) {
      setError('Authentication session is not yet ready. Please wait a moment.');
      return;
    }
    
    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      setMessage('Password set successfully! Redirecting to login...');
      toast({
        title: 'Success',
        description: 'Password set successfully.',
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to set password.';
      if (err.message.includes('Auth session missing')) {
        errorMessage = 'Authentication session expired or invalid. Please request a new verification email.';
      }
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Set Your Password</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {message && <p className="text-green-500 mb-4">{message}</p>}
      <form onSubmit={handleSetPassword} className="space-y-4">
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={!isSessionSet}
          />
        </div>
        <Button type="submit" disabled={!isSessionSet || !password || password.length < 6}>
          Set Password
        </Button>
      </form>
    </div>
  );
};

export default SetPassword;