// src/pages/ForgotPasswordPage.tsx

import React, { useState, FC, FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { getOrganizationSubdomain } from "../utils/subdomain";

const ForgotPasswordPage: FC = () => {
    const [email, setEmail] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handlePasswordReset = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const subdomain = getOrganizationSubdomain();
            if (!subdomain) {
                throw new Error("Could not determine organization. Please access this page via your organization's domain (e.g., your-company.hrumbles.ai).");
            }
            
            // Construct the redirect URL with the subdomain
            const redirectTo = `http://${subdomain}.hrumbles.ai/set-password`;


            const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectTo,
            });

            if (supabaseError) throw supabaseError;

            setMessage('Password reset link has been sent to your email. Please check your inbox.');

        } catch (err: any) {
            setError(err.message || 'Failed to send password reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Forgot Password</h1>
                    <p className="text-gray-500 mt-2">Enter your email to receive a reset link.</p>
                </div>
                <form onSubmit={handlePasswordReset} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                        />
                    </div>

                    {message && <p className="text-sm text-green-600 text-center">{message}</p>}
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center h-12 px-6 border rounded-lg text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>

                    <p className="text-center text-sm text-gray-600">
                        Remember your password?{' '}
                        <RouterLink to="/login" className="font-medium text-gray-800 hover:text-gray-900 underline">
                            Sign In
                        </RouterLink>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;