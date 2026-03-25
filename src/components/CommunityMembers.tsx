import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Crown, Shield, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Member {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    profile?: {
        username: string | null;
        avatar_url: string | null;
    };
}

interface CommunityMembersProps {
    communityId: string;
    isAdmin: boolean;
}

const CommunityMembers = ({ communityId, isAdmin }: CommunityMembersProps) => {
    const { session } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMembers = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("community_members")
                .select("id, user_id, role, joined_at")
                .eq("community_id", communityId)
                .order("role", { ascending: false })
                .order("joined_at", { ascending: true });

            if (!error && data) {
                const memberRows = data as Member[];
                const userIds = memberRows.map((member) => member.user_id);

                const { data: profiles } = userIds.length
                    ? await supabase
                        .from("profiles")
                        .select("id, username, avatar_url")
                        .in("id", userIds)
                    : { data: [] };

                const profilesById = new Map(
                    (profiles ?? []).map((profile) => [profile.id, profile])
                );

                setMembers(
                    memberRows.map((member) => ({
                        ...member,
                        profile: profilesById.get(member.user_id),
                    }))
                );
            }
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoading(false);
        }
    }, [communityId]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const changeRole = async (memberId: string, newRole: string) => {
        if (!isAdmin) return;

        try {
            await supabase
                .from("community_members")
                .update({ role: newRole })
                .eq("id", memberId);

            fetchMembers();
        } catch (error) {
            console.error("Error updating member role:", error);
        }
    };

    const removeMember = async (memberId: string) => {
        if (!isAdmin) return;

        try {
            await supabase
                .from("community_members")
                .delete()
                .eq("id", memberId);

            fetchMembers();
        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "admin":
                return <Crown className="h-4 w-4 text-yellow-500" />;
            case "moderator":
                return <Shield className="h-4 w-4 text-blue-500" />;
            default:
                return <User className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "admin":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
            case "moderator":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
            default:
                return "bg-secondary text-secondary-foreground";
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-secondary rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold">Community Members</h2>
                    <p className="text-muted-foreground">{members.length} members total</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member, index) => (
                    <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                        <Card className="hover:border-primary/50 transition-colors">
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                            {member.profile?.avatar_url ? (
                                                <img
                                                    src={member.profile.avatar_url}
                                                    alt={member.profile.username || "Member"}
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">
                                                {member.profile?.username || "User"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Joined{" "}
                                                {new Date(member.joined_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {getRoleIcon(member.role)}
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${getRoleColor(member.role)}`}>
                                        {getRoleIcon(member.role)}
                                        <span className="capitalize">{member.role}</span>
                                    </span>

                                    {isAdmin && member.user_id !== session?.user?.id && (
                                        <div className="flex gap-1">
                                            {member.role !== "admin" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => changeRole(member.id, member.role === "moderator" ? "member" : "moderator")}
                                                    className="h-8"
                                                >
                                                    {member.role === "moderator" ? "Unmoderator" : "Moderate"}
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8"
                                                onClick={() => removeMember(member.id)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {members.length === 0 && (
                <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No members yet</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default CommunityMembers;
