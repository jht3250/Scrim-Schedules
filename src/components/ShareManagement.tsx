import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Share2, UserPlus, X, Eye } from "lucide-react";

interface ShareManagementProps {
    userId: string;
}

interface Share {
    id: number;
    shared_with_username: string;
    created_at: string;
}

const ShareManagement: React.FC<ShareManagementProps> = ({ userId }) => {
    const [shares, setShares] = useState<Share[]>([]);
    const [newUsername, setNewUsername] = useState("");
    const [viewingUsername, setViewingUsername] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchShares();
    }, []);

    const fetchShares = async () => {
        const { data, error } = await supabase
            .from("schedule_shares")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching shares:", error);
        } else {
            setShares(data || []);
        }
    };

    const addShare = async () => {
        if (!newUsername) return;

        setError(null);
        setLoading(true);

        try {
            // Check if username exists
            const { data: profile } = await supabase
                .from("profiles")
                .select("username")
                .eq("username", newUsername)
                .single();

            if (!profile) {
                throw new Error("Username not found");
            }

            // Add share
            const { error } = await supabase.from("schedule_shares").insert({
                owner_id: userId,
                shared_with_username: newUsername,
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

    const viewSchedule = async (username: string) => {
        if (!username) return;

        // Reload the page with a query parameter to view another user's schedule
        window.location.href = `?view=${username}`;
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

                {/* View others' schedules */}
                <div>
                    <h3 className="font-medium mb-3">View Shared Schedule</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={viewingUsername}
                            onChange={(e) => setViewingUsername(e.target.value)}
                            placeholder="Enter username to view"
                            className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                            onClick={() => viewSchedule(viewingUsername)}
                            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
                        >
                            <Eye className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">
                        You can only view schedules that have been shared with
                        you
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ShareManagement;
