import React, { useState, useEffect } from "react";
import {
    Calendar,
    Clock,
    Plus,
    X,
    Trophy,
    Swords,
    Loader,
    Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Team, Event } from "../lib/supabase";

interface TeamSchedulerProps {
    userId: string;
    username?: string;
}

interface UserSchedule {
    username: string;
    teams: Team[];
    isOwn: boolean;
}

const TeamScheduler: React.FC<TeamSchedulerProps> = ({ userId, username }) => {
    const [userSchedules, setUserSchedules] = useState<UserSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddTeam, setShowAddTeam] = useState<boolean>(false);
    const [showAddEvent, setShowAddEvent] = useState<boolean>(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [newTeam, setNewTeam] = useState<{ name: string; events: Event[] }>({
        name: "",
        events: [],
    });
    const [newEvent, setNewEvent] = useState<Event>({
        day: "Monday",
        time: "",
        startTime: "",
        endTime: "",
        type: "Scrim",
    });

    const days: string[] = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ];
    const colors: string[] = [
        "bg-purple-500",
        "bg-blue-500",
        "bg-green-500",
        "bg-red-500",
        "bg-yellow-500",
        "bg-pink-500",
        "bg-indigo-500",
    ];
    const eventTypes: string[] = ["Scrim", "Match", "Warmup"];

    const addEventToExistingTeam = async (): Promise<void> => {
        if (selectedTeam && newEvent.startTime && newEvent.endTime) {
            try {
                const timeString = `${newEvent.startTime} - ${newEvent.endTime}`;

                const { error } = await supabase.from("events").insert({
                    team_id: selectedTeam.id,
                    day: newEvent.day,
                    time: timeString,
                    type: newEvent.type,
                });

                if (error) throw error;

                // Refresh schedules
                await fetchAllSchedules();

                setNewEvent({
                    day: "Monday",
                    time: "",
                    startTime: "",
                    endTime: "",
                    type: "Scrim",
                });
                setShowAddEvent(false);
                setSelectedTeam(null);
            } catch (error) {
                console.error("Error adding event:", error);
            }
        }
    };

    const openAddEventModal = (team: Team) => {
        setSelectedTeam(team);
        setShowAddEvent(true);
    };
    // Generate time options (15-minute intervals from 6PM to 12AM)
    const generateTimeOptions = () => {
        const times = [];
        // Start at 6PM (18:00) and go to midnight (24:00)
        for (let hour = 18; hour <= 24; hour++) {
            for (let min = 0; min < 60; min += 15) {
                if (hour === 24 && min > 0) break; // Stop after midnight

                const displayHour =
                    hour === 24 ? 12 : hour > 12 ? hour - 12 : hour;
                const period = hour === 24 ? "AM" : "PM";
                const time = `${displayHour}:${min
                    .toString()
                    .padStart(2, "0")} ${period}`;
                times.push(time);
            }
        }
        return times;
    };

    const timeOptions = generateTimeOptions();

    // Fetch all schedules on mount
    useEffect(() => {
        fetchAllSchedules();

        // DEBUG: Test RLS policy
        testRLSPolicy();

        // Temporary: expose supabase for console testing
        (window as any).testSupabase = supabase;
    }, [userId, username]);

    const testRLSPolicy = async () => {
        console.log("=== RLS POLICY TEST ===");

        // Test 1: Who am I?
        const {
            data: { user },
        } = await supabase.auth.getUser();
        console.log("Current user:", user?.email, "ID:", user?.id);

        // Test 2: Can I see Minkoui's teams directly?
        const { data: minkouiTeams, error: minkouiError } = await supabase
            .from("teams")
            .select("*")
            .eq("user_id", "0a62c72c-90ad-44cf-8052-0ac425a45212");

        console.log("Minkoui teams query result:", minkouiTeams);
        console.log("Minkoui teams error:", minkouiError);

        // Test 3: Get ALL teams I can see
        const { data: allTeams, error: allError } = await supabase
            .from("teams")
            .select("*");

        console.log("ALL teams I can see:", allTeams);
        console.log("All teams error:", allError);

        // Test 4: Check shares
        const { data: shares } = await supabase
            .from("shared_schedules")
            .select("*")
            .eq("shared_with_username", username);

        console.log("Shares for me:", shares);

        // Test 5: Call the debug function
        const { data: debugData, error: debugError } = await supabase.rpc(
            "debug_team_access",
            {
                team_user_id: "0a62c72c-90ad-44cf-8052-0ac425a45212",
            }
        );

        console.log("Debug function result:", debugData);
        console.log("Debug function error:", debugError);
    };

    const fetchAllSchedules = async () => {
        try {
            setLoading(true);

            // Add a small delay to ensure auth is ready
            await new Promise((resolve) => setTimeout(resolve, 100));

            const schedules: UserSchedule[] = [];

            // First, fetch own schedule
            const ownSchedule = await fetchUserSchedule(
                userId,
                username || "Me",
                true
            );
            if (ownSchedule) {
                schedules.push(ownSchedule);
            }

            // Then, fetch shared schedules
            if (userId) {
                const { data: sharedWithMe, error: shareError } = await supabase
                    .from("shared_schedules")
                    .select("*")
                    .eq("shared_with_user_id", userId);

                console.log("Shared with me:", sharedWithMe);
                console.log("Share error:", shareError);

                if (sharedWithMe) {
                    for (const share of sharedWithMe) {
                        const sharedSchedule = await fetchUserSchedule(
                            share.owner_id,
                            share.owner_username,
                            false
                        );
                        if (sharedSchedule) {
                            schedules.push(sharedSchedule);
                        }
                    }
                }
            }

            setUserSchedules(schedules);
        } catch (error) {
            console.error("Error fetching schedules:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserSchedule = async (
        fetchUserId: string,
        fetchUsername: string,
        isOwn: boolean
    ): Promise<UserSchedule | null> => {
        try {
            console.log(
                `Fetching schedule for ${fetchUsername} (${fetchUserId}), isOwn: ${isOwn}`
            );

            let teamsData: Team[] = [];
            let teamsError: any = null;

            if (isOwn) {
                // For own schedules, use direct query
                const result = await supabase
                    .from("teams")
                    .select("*")
                    .eq("user_id", fetchUserId)
                    .order("name");

                teamsData = result.data || [];
                teamsError = result.error;
            } else {
                // For shared schedules, use the RPC function that bypasses RLS
                console.log(
                    "Using get_accessible_teams RPC for shared schedule..."
                );
                const result = await supabase.rpc("get_accessible_teams");

                console.log("RPC raw result:", result);

                if (result.data) {
                    // The RPC returns teams with user_id property
                    // Filter to only get the specific user's teams
                    teamsData = result.data.filter(
                        (team: any) => team.user_id === fetchUserId
                    );
                    console.log(
                        `Filtered teams for ${fetchUserId}:`,
                        teamsData
                    );
                }
                teamsError = result.error;
            }

            console.log("Teams data:", teamsData);
            console.log("Teams error:", teamsError);

            if (teamsError) throw teamsError;

            // Fetch events for all teams
            const teamIds = teamsData?.map((team) => team.id) || [];
            console.log(`Fetching events for team IDs:`, teamIds);

            if (teamIds.length > 0) {
                let eventsData: any[] = [];
                let eventsError: any = null;

                if (isOwn) {
                    // For own teams, use direct query
                    const result = await supabase
                        .from("events")
                        .select("*")
                        .in("team_id", teamIds);

                    eventsData = result.data || [];
                    eventsError = result.error;
                } else {
                    // For shared teams, use RPC function if available
                    console.log(
                        "Using RPC to fetch events for shared teams..."
                    );
                    const result = await supabase.rpc(
                        "get_events_for_accessible_teams"
                    );

                    if (result.data) {
                        // Filter to only get events for the teams we're interested in
                        eventsData = result.data.filter((event: any) =>
                            teamIds.includes(event.team_id)
                        );
                    }
                    eventsError = result.error;
                }

                console.log(`Events data for ${fetchUsername}:`, eventsData);
                console.log(`Events error for ${fetchUsername}:`, eventsError);

                if (eventsError) throw eventsError;

                // Combine teams with their events
                const teamsWithEvents = teamsData.map((team) => ({
                    ...team,
                    events:
                        eventsData?.filter(
                            (event) => event.team_id === team.id
                        ) || [],
                }));

                console.log(
                    `Teams with events for ${fetchUsername}:`,
                    teamsWithEvents
                );

                return {
                    username: fetchUsername,
                    teams: teamsWithEvents,
                    isOwn,
                };
            }

            return {
                username: fetchUsername,
                teams: [],
                isOwn,
            };
        } catch (error) {
            console.error("Error fetching user schedule:", error);
            return null;
        }
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case "Match":
                return <Trophy className="w-3 h-3" />;
            case "Scrim":
                return <Swords className="w-3 h-3" />;
            case "Warmup":
                return <Clock className="w-3 h-3" />;
            default:
                return null;
        }
    };

    const addEventToNewTeam = (): void => {
        if (newEvent.startTime && newEvent.endTime) {
            const timeString = `${newEvent.startTime} - ${newEvent.endTime}`;
            setNewTeam({
                ...newTeam,
                events: [...newTeam.events, { ...newEvent, time: timeString }],
            });
            setNewEvent({
                day: "Monday",
                time: "",
                startTime: "",
                endTime: "",
                type: "Scrim",
            });
        }
    };

    const removeEventFromNewTeam = (index: number): void => {
        setNewTeam({
            ...newTeam,
            events: newTeam.events.filter((_, i) => i !== index),
        });
    };

    const saveNewTeam = async (): Promise<void> => {
        if (newTeam.name && newTeam.events.length > 0) {
            try {
                // Get current user's teams to determine color
                const ownTeams =
                    userSchedules.find((s) => s.isOwn)?.teams || [];

                // Insert team
                const { data: teamData, error: teamError } = await supabase
                    .from("teams")
                    .insert({
                        name: newTeam.name,
                        color: colors[ownTeams.length % colors.length],
                        user_id: userId,
                    })
                    .select()
                    .single();

                if (teamError) throw teamError;

                // Insert events
                const eventsToInsert = newTeam.events.map((event) => ({
                    team_id: teamData.id,
                    day: event.day,
                    time: event.time,
                    type: event.type,
                }));

                const { error: eventsError } = await supabase
                    .from("events")
                    .insert(eventsToInsert);

                if (eventsError) throw eventsError;

                // Refresh schedules
                await fetchAllSchedules();

                setNewTeam({ name: "", events: [] });
                setShowAddTeam(false);
            } catch (error) {
                console.error("Error saving team:", error);
            }
        }
    };

    const deleteEvent = async (eventId: number): Promise<void> => {
        try {
            const { error } = await supabase
                .from("events")
                .delete()
                .eq("id", eventId);

            if (error) throw error;

            // Refresh schedules
            await fetchAllSchedules();
        } catch (error) {
            console.error("Error deleting event:", error);
        }
    };

    const deleteTeam = async (teamId: number): Promise<void> => {
        try {
            const { error } = await supabase
                .from("teams")
                .delete()
                .eq("id", teamId);

            if (error) throw error;

            // Refresh schedules
            await fetchAllSchedules();
        } catch (error) {
            console.error("Error deleting team:", error);
        }
    };

    const getTeamsForDay = (day: string, teams: Team[]): Team[] => {
        return teams.filter(
            (team) =>
                team.events && team.events.some((event) => event.day === day)
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    const ownSchedule = userSchedules.find((s) => s.isOwn);
    const sharedSchedules = userSchedules.filter((s) => !s.isOwn);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-purple-400" />
                        <h1 className="text-3xl font-bold">
                            Team Schedule Tracker
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowAddTeam(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition"
                    >
                        <Plus className="w-5 h-5" />
                        Add Team
                    </button>
                </div>

                {/* Own Schedule */}
                {ownSchedule && (
                    <ScheduleSection
                        schedule={ownSchedule}
                        onDeleteTeam={deleteTeam}
                        onDeleteEvent={deleteEvent}
                        onAddEvent={openAddEventModal}
                        isOwn={true}
                    />
                )}

                {/* Shared Schedules */}
                {sharedSchedules.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Users className="w-6 h-6" />
                            Shared Schedules
                        </h2>
                        {sharedSchedules.map((schedule, index) => (
                            <div key={index} className="mb-12">
                                <ScheduleSection
                                    schedule={schedule}
                                    onDeleteTeam={() => {}}
                                    onDeleteEvent={() => {}}
                                    onAddEvent={() => {}}
                                    isOwn={false}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Team Modal */}
                {showAddTeam && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
                            <h2 className="text-2xl font-bold mb-4">
                                Add New Team
                            </h2>

                            <input
                                type="text"
                                placeholder="Team Name"
                                value={newTeam.name}
                                onChange={(e) =>
                                    setNewTeam({
                                        ...newTeam,
                                        name: e.target.value,
                                    })
                                }
                                className="w-full bg-gray-700 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />

                            <div className="mb-4">
                                <h3 className="font-semibold mb-2">
                                    Team Schedule
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <select
                                            value={newEvent.day}
                                            onChange={(e) =>
                                                setNewEvent({
                                                    ...newEvent,
                                                    day: e.target.value,
                                                })
                                            }
                                            className="bg-gray-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {days.map((day) => (
                                                <option key={day} value={day}>
                                                    {day}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={newEvent.type}
                                            onChange={(e) =>
                                                setNewEvent({
                                                    ...newEvent,
                                                    type: e.target.value,
                                                })
                                            }
                                            className="bg-gray-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {eventTypes.map((type) => (
                                                <option key={type} value={type}>
                                                    {type}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <label className="text-sm text-gray-400">
                                            Start:
                                        </label>
                                        <select
                                            value={newEvent.startTime}
                                            onChange={(e) =>
                                                setNewEvent({
                                                    ...newEvent,
                                                    startTime: e.target.value,
                                                })
                                            }
                                            className="flex-1 bg-gray-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="">
                                                Select time
                                            </option>
                                            {timeOptions.map((time) => (
                                                <option key={time} value={time}>
                                                    {time}
                                                </option>
                                            ))}
                                        </select>
                                        <label className="text-sm text-gray-400">
                                            End:
                                        </label>
                                        <select
                                            value={newEvent.endTime}
                                            onChange={(e) =>
                                                setNewEvent({
                                                    ...newEvent,
                                                    endTime: e.target.value,
                                                })
                                            }
                                            className="flex-1 bg-gray-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="">
                                                Select time
                                            </option>
                                            {timeOptions.map((time) => (
                                                <option key={time} value={time}>
                                                    {time}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={addEventToNewTeam}
                                            className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded transition"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    {newTeam.events.map((event, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between bg-gray-700 rounded px-3 py-1"
                                        >
                                            <span className="text-sm flex items-center gap-1">
                                                {getEventIcon(event.type)}
                                                {event.day} • {event.type} •{" "}
                                                {event.time}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    removeEventFromNewTeam(idx)
                                                }
                                                className="text-gray-400 hover:text-red-400"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={saveNewTeam}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition"
                                >
                                    Save Team
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddTeam(false);
                                        setNewTeam({ name: "", events: [] });
                                    }}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Event Modal */}
                {showAddEvent && selectedTeam && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
                            <h2 className="text-2xl font-bold mb-4">
                                Add Event to {selectedTeam.name}
                            </h2>

                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <select
                                        value={newEvent.day}
                                        onChange={(e) =>
                                            setNewEvent({
                                                ...newEvent,
                                                day: e.target.value,
                                            })
                                        }
                                        className="bg-gray-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        {days.map((day) => (
                                            <option key={day} value={day}>
                                                {day}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={newEvent.type}
                                        onChange={(e) =>
                                            setNewEvent({
                                                ...newEvent,
                                                type: e.target.value,
                                            })
                                        }
                                        className="bg-gray-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        {eventTypes.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <label className="text-sm text-gray-400">
                                        Start:
                                    </label>
                                    <select
                                        value={newEvent.startTime}
                                        onChange={(e) =>
                                            setNewEvent({
                                                ...newEvent,
                                                startTime: e.target.value,
                                            })
                                        }
                                        className="flex-1 bg-gray-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Select time</option>
                                        {timeOptions.map((time) => (
                                            <option key={time} value={time}>
                                                {time}
                                            </option>
                                        ))}
                                    </select>
                                    <label className="text-sm text-gray-400">
                                        End:
                                    </label>
                                    <select
                                        value={newEvent.endTime}
                                        onChange={(e) =>
                                            setNewEvent({
                                                ...newEvent,
                                                endTime: e.target.value,
                                            })
                                        }
                                        className="flex-1 bg-gray-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Select time</option>
                                        {timeOptions.map((time) => (
                                            <option key={time} value={time}>
                                                {time}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={addEventToExistingTeam}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition"
                                >
                                    Add Event
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddEvent(false);
                                        setSelectedTeam(null);
                                        setNewEvent({
                                            day: "Monday",
                                            time: "",
                                            startTime: "",
                                            endTime: "",
                                            type: "Scrim",
                                        });
                                    }}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Schedule Section Component
interface ScheduleSectionProps {
    schedule: UserSchedule;
    onDeleteTeam: (teamId: number) => void;
    onDeleteEvent: (eventId: number) => void;
    onAddEvent: (team: Team) => void;
    isOwn: boolean;
}

const ScheduleSection: React.FC<ScheduleSectionProps> = ({
    schedule,
    onDeleteTeam,
    onDeleteEvent,
    onAddEvent,
    isOwn,
}) => {
    const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ];

    const getEventIcon = (type: string) => {
        switch (type) {
            case "Match":
                return <Trophy className="w-3 h-3" />;
            case "Scrim":
                return <Swords className="w-3 h-3" />;
            case "Warmup":
                return <Clock className="w-3 h-3" />;
            default:
                return null;
        }
    };

    const getTeamsForDay = (day: string): Team[] => {
        return schedule.teams.filter(
            (team) =>
                team.events && team.events.some((event) => event.day === day)
        );
    };

    return (
        <div>
            {!isOwn && (
                <h3 className="text-xl font-semibold mb-4 text-purple-400">
                    {schedule.username}'s Schedule
                </h3>
            )}

            {/* Weekly Calendar View */}
            <div className="mb-8 bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Weekly Schedule {!isOwn && `- ${schedule.username}`}
                </h2>
                <div className="grid grid-cols-7 gap-2">
                    {days.map((day) => (
                        <div key={day} className="bg-gray-700 rounded-lg p-3">
                            <h3 className="font-semibold text-center mb-2 text-sm">
                                {day}
                            </h3>
                            <div className="space-y-1">
                                {getTeamsForDay(day).map(
                                    (team) =>
                                        team.events &&
                                        team.events
                                            .filter(
                                                (event) => event.day === day
                                            )
                                            .map((event, idx) => (
                                                <div
                                                    key={`${team.id}-${idx}`}
                                                    className={`${team.color} text-white text-xs p-2 rounded`}
                                                >
                                                    <div className="font-semibold flex items-center justify-center gap-1">
                                                        {getEventIcon(
                                                            event.type
                                                        )}
                                                        {team.name}
                                                    </div>
                                                    <div className="text-xs opacity-90 text-center">
                                                        {event.type}
                                                    </div>
                                                    <div className="text-xs opacity-75 text-center">
                                                        {event.time}
                                                    </div>
                                                </div>
                                            ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Teams List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedule.teams.map((team) => (
                    <div key={team.id} className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-4 h-4 ${team.color} rounded`}
                                ></div>
                                <h3 className="text-xl font-semibold">
                                    {team.name}
                                </h3>
                            </div>
                            {isOwn && (
                                <button
                                    onClick={() => onDeleteTeam(team.id)}
                                    className="text-gray-400 hover:text-red-400 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {team.events &&
                                team.events.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Clock className="w-4 h-4" />
                                            <span className="flex items-center gap-1">
                                                {getEventIcon(event.type)}
                                                {event.day} • {event.type} •{" "}
                                                {event.time}
                                            </span>
                                        </div>
                                        {isOwn && (
                                            <button
                                                onClick={() =>
                                                    event.id &&
                                                    onDeleteEvent(event.id)
                                                }
                                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            {isOwn && (
                                <button
                                    onClick={() => onAddEvent(team)}
                                    className="w-full mt-3 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 py-2 px-3 rounded-lg transition text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Event
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamScheduler;
