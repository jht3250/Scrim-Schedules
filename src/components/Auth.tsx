import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { User, Lock, Mail, Loader, CheckCircle } from "lucide-react";

interface AuthProps {
    onSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmationMessage, setShowConfirmationMessage] =
        useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            if (mode === "signup") {
                // Check if username is already taken
                const { data: existingUser } = await supabase
                    .from("profiles")
                    .select("username")
                    .eq("username", username)
                    .single();

                if (existingUser) {
                    throw new Error("Username already taken");
                }

                // Sign up with username in metadata
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username,
                        },
                    },
                });

                if (signUpError) throw signUpError;

                // After successful signup, switch to login mode and show confirmation message
                setMode("login");
                setShowConfirmationMessage(true);
                setPassword(""); // Clear password for security
                setUsername(""); // Clear username
            } else {
                // Sign in
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                onSuccess();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md">
                <h2 className="text-3xl font-bold text-center mb-8">
                    {mode === "login" ? "Welcome Back" : "Create Account"}
                </h2>

                {/* Confirmation Message */}
                {showConfirmationMessage && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-400">
                            <p className="font-semibold mb-1">
                                Please confirm your email
                            </p>
                            <p className="text-green-400/80">
                                We've sent a confirmation link to your email
                                address. Please check your inbox and click the
                                link to activate your account.
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {mode === "signup" && (
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                    placeholder="Choose a unique username"
                                    className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader className="w-5 h-5 animate-spin" />
                        ) : mode === "login" ? (
                            "Sign In"
                        ) : (
                            "Create Account"
                        )}
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-gray-400">
                        {mode === "login"
                            ? "Don't have an account?"
                            : "Already have an account?"}
                    </p>
                    <button
                        onClick={() => {
                            setMode(mode === "login" ? "signup" : "login");
                            setError(null);
                            setShowConfirmationMessage(false);
                        }}
                        className="text-purple-400 hover:text-purple-300 font-medium mt-1"
                    >
                        {mode === "login" ? "Sign Up" : "Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
