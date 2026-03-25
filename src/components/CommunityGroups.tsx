import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, MessageSquare, Lock, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Group {
    id: string;
    name: string;
    description: string;
    is_private: boolean;
    created_by: string;
    created_at: string;
}

interface CommunityGroupsProps {
    communityId: string;
    canCreate: boolean;
}

const CommunityGroups = ({ communityId, canCreate }: CommunityGroupsProps) => {
    const { session } = useAuth();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        is_private: false,
    });

    const fetchGroups = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("community_groups")
                .select("*")
                .eq("community_id", communityId)
                .order("created_at", { ascending: false });

            if (!error && data) {
                setGroups(data as Group[]);
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            setLoading(false);
        }
    }, [communityId]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const createGroup = async () => {
        if (!session?.user?.id || !formData.name.trim()) return;

        try {
            await supabase.from("community_groups").insert({
                community_id: communityId,
                name: formData.name,
                description: formData.description,
                is_private: formData.is_private,
                created_by: session.user.id,
            });

            setFormData({ name: "", description: "", is_private: false });
            setOpen(false);
            fetchGroups();
        } catch (error) {
            console.error("Error creating group:", error);
        }
    };

    const deleteGroup = async (groupId: string) => {
        try {
            await supabase
                .from("community_groups")
                .delete()
                .eq("id", groupId);

            fetchGroups();
        } catch (error) {
            console.error("Error deleting group:", error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-secondary rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Community Groups</h2>
                    <p className="text-muted-foreground">Organize discussions by topic</p>
                </div>
                {canCreate && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-bg text-primary-foreground hover:opacity-90">
                                <Plus className="h-4 w-4 mr-2" /> Create Group
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Group</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Group Name</label>
                                    <Input
                                        placeholder="e.g., General Discussion"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Description
                                    </label>
                                    <Textarea
                                        placeholder="What's this group about?"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        rows={3}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="private"
                                        checked={formData.is_private}
                                        onChange={(e) =>
                                            setFormData({ ...formData, is_private: e.target.checked })
                                        }
                                        className="rounded"
                                    />
                                    <label htmlFor="private" className="text-sm font-medium cursor-pointer">
                                        Make this group private (invitation only)
                                    </label>
                                </div>
                                <Button
                                    onClick={createGroup}
                                    className="gradient-bg text-primary-foreground hover:opacity-90 w-full"
                                    disabled={!formData.name.trim()}
                                >
                                    Create Group
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {groups.map((group, index) => (
                    <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                        <Card className="hover:border-primary/50 transition-all duration-300 group cursor-pointer h-full">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                                        <h3 className="font-semibold truncate">{group.name}</h3>
                                    </div>
                                    {group.is_private && (
                                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    {group.description ||
                                        "No description provided"}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        Created{" "}
                                        {new Date(group.created_at).toLocaleDateString()}
                                    </span>
                                    {canCreate && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => deleteGroup(group.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {groups.length === 0 && (
                <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                            No groups yet. {canCreate && "Create one to get started!"}
                        </p>
                        {canCreate && (
                            <Dialog open={open} onOpenChange={setOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gradient-bg text-primary-foreground hover:opacity-90">
                                        <Plus className="h-4 w-4 mr-2" /> Create Group
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create New Group</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">
                                                Group Name
                                            </label>
                                            <Input
                                                placeholder="e.g., General Discussion"
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, name: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">
                                                Description
                                            </label>
                                            <Textarea
                                                placeholder="What's this group about?"
                                                value={formData.description}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        description: e.target.value,
                                                    })
                                                }
                                                rows={3}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="private"
                                                checked={formData.is_private}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        is_private: e.target.checked,
                                                    })
                                                }
                                                className="rounded"
                                            />
                                            <label
                                                htmlFor="private"
                                                className="text-sm font-medium cursor-pointer"
                                            >
                                                Make this group private
                                            </label>
                                        </div>
                                        <Button
                                            onClick={createGroup}
                                            className="gradient-bg text-primary-foreground hover:opacity-90 w-full"
                                            disabled={!formData.name.trim()}
                                        >
                                            Create Group
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

export default CommunityGroups;
