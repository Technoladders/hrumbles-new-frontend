// src/pages/SetPassword.tsx

import React, { useState, useEffect, FC, FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client"; // Ensure this path is correct

type AuthStatus = 'checking' | 'authenticated' | 'error';

const SetPasswordPage: FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');

    // This effect runs on component mount to verify the magic link
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // This event fires when the Supabase client detects the password recovery token in the URL
            if (event === 'PASSWORD_RECOVERY' && session) {
                setAuthStatus('authenticated');
            }
        });

        // If the event doesn't fire after a short delay, the link is likely invalid or expired.
        const timer = setTimeout(() => {
            if (authStatus === 'checking') {
                setAuthStatus('error');
                setError("Invalid or expired link. Please request a new one.");
            }
        }, 3000); // 3-second timeout

        // Cleanup subscription on component unmount
        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, [authStatus]); // Rerun if authStatus changes (though it shouldn't after the first load)

    const handleSetPassword = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        // --- Client-side validation ---
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            // The user is already in a temporary session, so we can update their details
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;
            
            setMessage("Your password has been updated successfully!");
            
            // Redirect to login after a short delay
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };
    
    // Render different content based on the authentication status
    const renderContent = () => {
        switch (authStatus) {
            case 'checking':
                return <p className="text-center text-gray-600">Verifying your link...</p>;
            
            case 'error':
                return (
                    <div className="text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <RouterLink to="/login" className="font-medium text-gray-800 hover:text-gray-900 underline">
                            Go to Login
                        </RouterLink>
                    </div>
                );

            case 'authenticated':
                return (
                    <form onSubmit={handleSetPassword} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                            />
                        </div>

                        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                        {message && <p className="text-sm text-green-600 text-center">{message}</p>}

                        <button
                            type="submit"
                            disabled={loading || !!message} // Disable after success
                            className="w-full flex justify-center items-center h-12 px-6 border rounded-lg text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400"
                        >
                            {loading ? 'Saving...' : 'Set New Password'}
                        </button>
                    </form>
                );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Set Your Password</h1>
                    <p className="text-gray-500 mt-2">
                        {authStatus === 'authenticated' ? 'Please choose a secure new password.' : ''}
                    </p>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default SetPasswordPage;