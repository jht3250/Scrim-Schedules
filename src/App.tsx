import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { User, LogOut } from "lucide-react";
import Auth from "./components/Auth";
import TeamScheduler from "./components/TeamScheduler";
import ShareManagement from "./components/ShareManagement";

const App: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        checkSession();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkSession = async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user || null);
        if (session?.user) {
            await fetchProfile(session.user.id);
        }
        setLoading(false);
    };

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (error) {
            console.error("Error fetching profile:", error);
        } else {
            setProfile(data);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Auth onSuccess={checkSession} />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            <span className="font-medium">
                                {profile?.username}
                            </span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-2 text-gray-300 hover:text-white transition"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4">
                <div className="max-w-7xl mx-auto">
                    <ShareManagement
                        userId={user.id}
                        username={profile?.username}
                    />
                    <TeamScheduler
                        userId={user.id}
                        username={profile?.username}
                    />
                </div>
            </div>
        </div>
    );
};

export default App;
