import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Share2, UserPlus, X, Users } from "lucide-react";

interface ShareManagementProps {
    userId: string;
    username?: string;
}

interface Share {
    id: number;
    shared_with_username: string;
    created_at: string;
}

interface SharedWithMe {
    id: number;
    owner_username: string;
    created_at: string;
}

const ShareManagement: React.FC<ShareManagementProps> = ({
    userId,
    username,
}) => {
    const [shares, setShares] = useState<Share[]>([]);
    const [sharedWithMe, setSharedWithMe] = useState<SharedWithMe[]>([]);
    const [newUsername, setNewUsername] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchShares();
        fetchSharedWithMe();
    }, [username]);

    const fetchShares = async () => {
        // Use the view instead of the table to get usernames
        const { data, error } = await supabase
            .from("shared_schedules")
            .select("*")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching shares:", error);
        } else {
            setShares(data || []);
        }
    };

    const fetchSharedWithMe = async () => {
        if (!username) return;

        const { data, error } = await supabase
            .from("shared_schedules")
            .select("*")
            .eq("shared_with_username", username)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching shared schedules:", error);
        } else {
            setSharedWithMe(data || []);
        }
    };

    const addShare = async () => {
        if (!newUsername) return;

        setError(null);
        setLoading(true);

        try {
            // Check if username exists and get their ID
            const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("username", newUsername)
                .single();

            if (!profile) {
                throw new Error("Username not found");
            }

            // Add share using the user ID
            const { error } = await supabase.from("schedule_shares").insert({
                owner_id: userId,
                shared_with_user_id: profile.id,
            });

            if (error) throw error;

            await fetchShares();
            setNewUsername("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const removeShare = async (id: number) => {
        const { error } = await supabase
            .from("schedule_shares")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error removing share:", error);
        } else {
            await fetchShares();
        }
    };

    return (
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Schedule Sharing
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Share with others */}
                <div>
                    <h3 className="font-medium mb-3">Share Your Schedule</h3>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="Enter username"
                            className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                            onClick={addShare}
                            disabled={loading}
                            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
                        >
                            <UserPlus className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500 rounded-lg p-2 text-red-400 text-sm mb-3">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        {shares.map((share) => (
                            <div
                                key={share.id}
                                className="flex items-center justify-between bg-gray-700 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm">
                                    {share.shared_with_username}
                                </span>
                                <button
                                    onClick={() => removeShare(share.id)}
                                    className="text-gray-400 hover:text-red-400 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {shares.length === 0 && (
                            <p className="text-gray-400 text-sm">
                                Not sharing with anyone yet
                            </p>
                        )}
                    </div>
                </div>

                {/* People sharing with you */}
                <div>
                    <h3 className="font-medium mb-3">Shared With You</h3>

                    {sharedWithMe.length > 0 ? (
                        <div className="space-y-2">
                            {sharedWithMe.map((share) => (
                                <div
                                    key={share.id}
                                    className="bg-gray-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
                                >
                                    <Users className="w-4 h-4 text-purple-400" />
                                    <span>{share.owner_username}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">
                            No one has shared their schedule with you yet
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareManagement;
