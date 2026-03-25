import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, FolderKanban, MessageSquare, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CommunityConversation from "@/components/CommunityConversation";
import CommunityMembers from "@/components/CommunityMembers";
import CommunityMeetings from "@/components/CommunityMeetings";
import CommunityProjects from "@/components/CommunityProjects";
import CommunityRequests from "@/components/CommunityRequests";

interface Community {
    id: string;
    name: string;
    description: string;
    category: string;
    creator_id: string;
    member_count: number;
    created_at: string;
}

interface JoinRequest {
    id: string;
    status: string;
    message: string | null;
}

const CommunityDetail = () => {
    const { communityId } = useParams<{ communityId: string }>();
    const navigate = useNavigate();
    const { session } = useAuth();
    const tabStorageKey = communityId ? `community-tab:${communityId}` : "community-tab";
    const [community, setCommunity] = useState<Community | null>(null);
    const [isMember, setIsMember] = useState(false);
    const [userRole, setUserRole] = useState<string>("");
    const [joinRequest, setJoinRequest] = useState<JoinRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [requestingJoin, setRequestingJoin] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (!communityId) return;

        const savedTab = window.localStorage.getItem(tabStorageKey);
        setActiveTab(savedTab || "overview");
    }, [communityId, tabStorageKey]);

    useEffect(() => {
        if (!communityId) return;
        window.localStorage.setItem(tabStorageKey, activeTab);
    }, [activeTab, communityId, tabStorageKey]);

    const fetchCommunityDetails = useCallback(async () => {
        if (!communityId) return;

        setLoading(true);
        setIsMember(false);
        setUserRole("");
        setJoinRequest(null);

        try {
            // Fetch community details
            const { data: communityData, error: communityError } = await supabase
                .from("communities")
                .select("*")
                .eq("id", communityId)
                .single();

            if (communityError) throw communityError;
            setCommunity(communityData);

            // Check if user is a member
            if (session?.user?.id) {
                const { data: memberData, error: memberError } = await supabase
                    .from("community_members")
                    .select("*")
                    .eq("community_id", communityId)
                    .eq("user_id", session.user.id)
                    .maybeSingle();

                if (memberError) {
                    throw memberError;
                }

                if (memberData) {
                    setIsMember(true);
                    setUserRole(memberData.role);
                } else if (communityData.creator_id === session.user.id) {
                    setIsMember(true);
                    setUserRole("admin");
                } else {
                    const { data: requestData, error: requestError } = await supabase
                        .from("community_join_requests")
                        .select("id, status, message")
                        .eq("community_id", communityId)
                        .eq("user_id", session.user.id)
                        .maybeSingle();

                    if (requestError) {
                        throw requestError;
                    }

                    if (requestData) {
                        setJoinRequest(requestData);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching community:", error);
        } finally {
            setLoading(false);
        }
    }, [communityId, session?.user?.id]);

    useEffect(() => {
        fetchCommunityDetails();
    }, [fetchCommunityDetails]);

    const isCreatorAdmin = community?.creator_id === session?.user?.id;

    const joinCommunity = async () => {
        if (!session?.user?.id || !communityId) return;

        setRequestingJoin(true);

        try {
            const { data: existingMembership, error: membershipLookupError } = await supabase
                .from("community_members")
                .select("id, role")
                .eq("community_id", communityId)
                .eq("user_id", session.user.id)
                .maybeSingle();

            if (membershipLookupError) {
                throw membershipLookupError;
            }

            if (!existingMembership) {
                const { data: existingRequest, error: existingRequestError } = await supabase
                    .from("community_join_requests")
                    .select("id, status")
                    .eq("community_id", communityId)
                    .eq("user_id", session.user.id)
                    .maybeSingle();

                if (existingRequestError) {
                    throw existingRequestError;
                }

                if (existingRequest?.status === "pending") {
                    setJoinRequest({ ...existingRequest, message: null });
                    toast.message("Your join request is already pending.");
                    return;
                }

                if (existingRequest) {
                    const { error: updateRequestError } = await supabase
                        .from("community_join_requests")
                        .update({
                            status: "pending",
                            reviewed_at: null,
                            reviewed_by: null,
                        })
                        .eq("id", existingRequest.id);

                    if (updateRequestError) {
                        throw updateRequestError;
                    }
                } else {
                    const { error: createRequestError } = await supabase
                        .from("community_join_requests")
                        .insert({
                            community_id: communityId,
                            user_id: session.user.id,
                            status: "pending",
                            message: `Hi, I would like to join ${community?.name || "this community"}.`,
                        });

                    if (createRequestError) {
                        throw createRequestError;
                    }
                }
            }

            if (existingMembership) {
                setIsMember(true);
                setUserRole(existingMembership.role ?? "member");
            } else {
                toast.success("Join request sent to the community admin.");
            }
            fetchCommunityDetails();
        } catch (error) {
            console.error("Error joining community:", error);
            toast.error("Failed to send join request.");
        } finally {
            setRequestingJoin(false);
        }
    };

    const deleteCommunity = async () => {
        if (!communityId || !isCreatorAdmin) return;

        setDeleting(true);

        try {
            const { error } = await supabase
                .from("communities")
                .delete()
                .eq("id", communityId)
                .eq("creator_id", session.user.id);

            if (error) {
                throw error;
            }

            window.localStorage.removeItem(tabStorageKey);
            toast.success("Community deleted successfully.");
            navigate("/");
        } catch (error) {
            console.error("Error deleting community:", error);
            toast.error("Failed to delete community.");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-4">
                <div className="container mx-auto">
                    <div className="animate-pulse">
                        <div className="h-12 w-24 bg-secondary rounded mb-8" />
                        <div className="h-40 bg-secondary rounded mb-6" />
                        <div className="h-96 bg-secondary rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (!community) {
        return (
            <div className="min-h-screen bg-background p-4">
                <div className="container mx-auto">
                    <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Card>
                        <CardContent className="pt-8">
                            <p className="text-center text-muted-foreground">Community not found</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border p-6 md:p-8">
                <div className="container mx-auto">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/")}
                        className="mb-6 hover:bg-primary/10"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                    </Button>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
                    >
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold mb-2">{community.name}</h1>
                            <p className="text-lg text-muted-foreground mb-4">{community.description}</p>
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium">
                                    <Users className="h-4 w-4" /> {community.member_count} Members
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2 text-sm font-medium">
                                    {community.category}
                                </span>
                            </div>
                        </div>

                        {!isMember && (
                            <Button
                                onClick={joinCommunity}
                                disabled={requestingJoin || joinRequest?.status === "pending"}
                                className="gradient-bg text-primary-foreground hover:opacity-90 transition-opacity min-w-fit"
                            >
                                {joinRequest?.status === "pending"
                                    ? "Request Pending"
                                    : requestingJoin
                                      ? "Sending Request..."
                                      : "Request to Join"}
                            </Button>
                        )}

                        {isCreatorAdmin && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        className="min-w-fit"
                                        disabled={deleting}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Community
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this community?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently remove the community, its members,
                                            groups, and meetings. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={deleteCommunity}
                                            disabled={deleting}
                                        >
                                            {deleting ? "Deleting..." : "Delete"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto p-6 md:p-8">
                {!isMember ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-semibold mb-4">Request access to join this community</p>
                            <p className="text-muted-foreground mb-6">
                                The community admin will review your request before you can access conversation,
                                meetings, projects, and members.
                            </p>
                            {joinRequest?.status === "pending" && (
                                <p className="text-sm text-primary mb-6">
                                    Your request is pending admin approval.
                                </p>
                            )}
                            <Button
                                onClick={joinCommunity}
                                disabled={requestingJoin || joinRequest?.status === "pending"}
                                className="gradient-bg text-primary-foreground hover:opacity-90"
                            >
                                {joinRequest?.status === "pending" ? "Request Pending" : "Send Join Request"}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className={`grid w-full mb-8 ${userRole === "admin" || userRole === "moderator" ? "grid-cols-5" : "grid-cols-4"}`}>
                            <TabsTrigger value="overview">Conversation</TabsTrigger>
                            <TabsTrigger value="meetings">Meetings</TabsTrigger>
                            <TabsTrigger value="projects">Projects</TabsTrigger>
                            <TabsTrigger value="members">Members</TabsTrigger>
                            {(userRole === "admin" || userRole === "moderator") && (
                                <TabsTrigger value="requests">Requests</TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <CommunityConversation />
                            </motion.div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                >
                                    <Card className="h-full">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Users className="h-5 w-5" />
                                                Quick Stats
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-center pb-2 border-b">
                                                <span className="text-muted-foreground">Total Members</span>
                                                <span className="font-semibold">{community.member_count}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b">
                                                <span className="text-muted-foreground">Your Role</span>
                                                <span className="font-semibold capitalize">{userRole}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Category</span>
                                                <span className="font-semibold">{community.category}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                >
                                    <Card className="h-full">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <ShieldCheck className="h-5 w-5" />
                                                Access Flow
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                New members must send a request, and admins can review those
                                                requests from the dedicated Requests section.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </TabsContent>

                        <TabsContent value="meetings">
                            <CommunityMeetings
                                communityId={community.id}
                                canCreate={userRole === "admin" || userRole === "moderator" || isMember}
                            />
                        </TabsContent>

                        <TabsContent value="projects">
                            <CommunityProjects canManage={userRole === "admin" || userRole === "moderator"} />
                        </TabsContent>

                        <TabsContent value="members">
                            <CommunityMembers communityId={community.id} isAdmin={userRole === "admin"} />
                        </TabsContent>

                        {(userRole === "admin" || userRole === "moderator") && (
                            <TabsContent value="requests">
                                <CommunityRequests
                                    communityId={community.id}
                                    canManage={userRole === "admin" || userRole === "moderator"}
                                    currentUserId={session?.user?.id}
                                    onRequestHandled={fetchCommunityDetails}
                                />
                            </TabsContent>
                        )}
                    </Tabs>
                )}
            </div>
        </div>
    );
};

export default CommunityDetail;
