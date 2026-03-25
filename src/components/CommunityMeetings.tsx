import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Video, Clock, Users, Trash2, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Meeting {
    id: string;
    title: string;
    description: string;
    scheduled_at: string;
    status: string;
    created_by: string;
    meeting_url: string | null;
    max_participants: number | null;
    created_at: string;
}

interface CommunityMeetingsProps {
    communityId: string;
    canCreate: boolean;
}

const CommunityMeetings = ({
    communityId,
    canCreate,
}: CommunityMeetingsProps) => {
    const { session } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        scheduled_at: "",
        meeting_url: "",
        max_participants: "",
    });

    const fetchMeetings = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("community_meetings")
                .select("*")
                .eq("community_id", communityId)
                .order("scheduled_at", { ascending: true });

            if (!error && data) {
                setMeetings(data as Meeting[]);
            }
        } catch (error) {
            console.error("Error fetching meetings:", error);
        } finally {
            setLoading(false);
        }
    }, [communityId]);

    useEffect(() => {
        fetchMeetings();
    }, [fetchMeetings]);

    const createMeeting = async () => {
        if (!session?.user?.id || !formData.title.trim() || !formData.scheduled_at) {
            return;
        }

        try {
            // Generate meeting URL if not provided
            const meetingUrl =
                formData.meeting_url ||
                `https://meet.example.com/${Math.random().toString(36).substr(2, 9)}`;

            await supabase.from("community_meetings").insert({
                community_id: communityId,
                title: formData.title,
                description: formData.description,
                scheduled_at: formData.scheduled_at,
                meeting_url: meetingUrl,
                max_participants: formData.max_participants
                    ? parseInt(formData.max_participants)
                    : null,
                created_by: session.user.id,
                status: "scheduled",
            });

            setFormData({
                title: "",
                description: "",
                scheduled_at: "",
                meeting_url: "",
                max_participants: "",
            });
            setOpen(false);
            fetchMeetings();
        } catch (error) {
            console.error("Error creating meeting:", error);
        }
    };

    const deleteMeeting = async (meetingId: string) => {
        try {
            await supabase
                .from("community_meetings")
                .delete()
                .eq("id", meetingId);

            fetchMeetings();
        } catch (error) {
            console.error("Error deleting meeting:", error);
        }
    };

    const joinMeeting = async (meeting: Meeting) => {
        if (!session?.user?.id) return;

        try {
            // Add user as participant
            await supabase.from("meeting_participants").insert({
                meeting_id: meeting.id,
                user_id: session.user.id,
            });

            // Open meeting URL
            if (meeting.meeting_url) {
                window.open(meeting.meeting_url, "_blank");
            }
        } catch (error) {
            console.error("Error joining meeting:", error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "scheduled":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
            case "ongoing":
                return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 animate-pulse";
            case "completed":
                return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
            case "canceled":
                return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
            default:
                return "bg-secondary text-secondary-foreground";
        }
    };

    const isUpcoming = (scheduledAt: string) => {
        return new Date(scheduledAt) > new Date();
    };

    const upcomingMeetings = meetings.filter(
        (m) => isUpcoming(m.scheduled_at) && m.status !== "canceled"
    );
    const pastMeetings = meetings.filter(
        (m) => !isUpcoming(m.scheduled_at) || m.status === "canceled"
    );

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-secondary rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Meetings & Calls</h2>
                    <p className="text-muted-foreground">Schedule and join community events</p>
                </div>
                {canCreate && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-bg text-primary-foreground hover:opacity-90">
                                <Plus className="h-4 w-4 mr-2" /> Schedule Meeting
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Schedule a Meeting</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Meeting Title
                                    </label>
                                    <Input
                                        placeholder="e.g., Weekly Standup"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Description
                                    </label>
                                    <Textarea
                                        placeholder="What's this meeting about?"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                description: e.target.value,
                                            })
                                        }
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Date & Time
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.scheduled_at}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                scheduled_at: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Meeting URL (optional)
                                    </label>
                                    <Input
                                        placeholder="https://zoom.us/..."
                                        value={formData.meeting_url}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                meeting_url: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Max Participants (optional)
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="e.g., 50"
                                        value={formData.max_participants}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                max_participants: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <Button
                                    onClick={createMeeting}
                                    className="gradient-bg text-primary-foreground hover:opacity-90 w-full"
                                    disabled={!formData.title.trim() || !formData.scheduled_at}
                                >
                                    Schedule Meeting
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {upcomingMeetings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Upcoming</h3>
                    <div className="space-y-4">
                        {upcomingMeetings.map((meeting, index) => (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                            >
                                <Card className="hover:border-primary/50 transition-colors group">
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-lg font-semibold truncate">
                                                        {meeting.title}
                                                    </h3>
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium flex-shrink-0 ${getStatusColor(
                                                            meeting.status
                                                        )}`}
                                                    >
                                                        {meeting.status === "ongoing" ? (
                                                            <Phone className="h-3 w-3" />
                                                        ) : (
                                                            <Video className="h-3 w-3" />
                                                        )}
                                                        {meeting.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                                    {meeting.description}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {new Date(
                                                            meeting.scheduled_at
                                                        ).toLocaleDateString()}{" "}
                                                        at{" "}
                                                        {new Date(
                                                            meeting.scheduled_at
                                                        ).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                    {meeting.max_participants && (
                                                        <span className="flex items-center gap-1">
                                                            <Users className="h-4 w-4" />
                                                            Max {meeting.max_participants} participants
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                {meeting.meeting_url && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => joinMeeting(meeting)}
                                                        className="gradient-bg text-primary-foreground hover:opacity-90"
                                                    >
                                                        <Phone className="h-4 w-4 mr-2" /> Join
                                                    </Button>
                                                )}
                                                {canCreate && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => deleteMeeting(meeting.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {pastMeetings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                        Past Meetings
                    </h3>
                    <div className="space-y-4 opacity-60">
                        {pastMeetings.map((meeting, index) => (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                            >
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-lg font-semibold truncate">
                                                        {meeting.title}
                                                    </h3>
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium flex-shrink-0 ${getStatusColor(
                                                            meeting.status
                                                        )}`}
                                                    >
                                                        {meeting.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {new Date(
                                                            meeting.scheduled_at
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {meetings.length === 0 && (
                <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                        <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                            No meetings scheduled yet.
                            {canCreate && " Schedule one to get started!"}
                        </p>
                        {canCreate && (
                            <Dialog open={open} onOpenChange={setOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gradient-bg text-primary-foreground hover:opacity-90">
                                        <Plus className="h-4 w-4 mr-2" /> Schedule First Meeting
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Schedule a Meeting</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">
                                                Meeting Title
                                            </label>
                                            <Input
                                                placeholder="e.g., Weekly Standup"
                                                value={formData.title}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        title: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">
                                                Description
                                            </label>
                                            <Textarea
                                                placeholder="What's this meeting about?"
                                                value={formData.description}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        description: e.target.value,
                                                    })
                                                }
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">
                                                Date & Time
                                            </label>
                                            <Input
                                                type="datetime-local"
                                                value={formData.scheduled_at}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        scheduled_at: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">
                                                Meeting URL (optional)
                                            </label>
                                            <Input
                                                placeholder="https://zoom.us/..."
                                                value={formData.meeting_url}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        meeting_url: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">
                                                Max Participants (optional)
                                            </label>
                                            <Input
                                                type="number"
                                                placeholder="e.g., 50"
                                                value={formData.max_participants}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        max_participants: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <Button
                                            onClick={createMeeting}
                                            className="gradient-bg text-primary-foreground hover:opacity-90 w-full"
                                            disabled={!formData.title.trim() || !formData.scheduled_at}
                                        >
                                            Schedule Meeting
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default CommunityMeetings;
