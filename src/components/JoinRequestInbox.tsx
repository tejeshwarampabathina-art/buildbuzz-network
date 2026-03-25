import { useCallback, useEffect, useState } from "react";
import { Bell, Check, MessageCircleWarning, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface InboxRequest {
  id: string;
  community_id: string;
  user_id: string;
  message: string | null;
  created_at: string;
  status: string;
  communityName?: string;
  username?: string | null;
}

interface JoinRequestInboxProps {
  userId: string;
}

const JoinRequestInbox = ({ userId }: JoinRequestInboxProps) => {
  const [requests, setRequests] = useState<InboxRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const { data: communities, error: communitiesError } = await supabase
        .from("communities")
        .select("id, name")
        .eq("creator_id", userId);

      if (communitiesError) {
        throw communitiesError;
      }

      const communityIds = (communities ?? []).map((community) => community.id);
      const communityNameMap = new Map((communities ?? []).map((community) => [community.id, community.name]));

      if (!communityIds.length) {
        setRequests([]);
        return;
      }

      const { data: requestData, error: requestError } = await supabase
        .from("community_join_requests")
        .select("id, community_id, user_id, message, created_at, status")
        .in("community_id", communityIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requestError) {
        throw requestError;
      }

      const userIds = (requestData ?? []).map((request) => request.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, username").in("id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));

      setRequests(
        (requestData ?? []).map((request) => ({
          ...request,
          communityName: communityNameMap.get(request.community_id),
          username: profileMap.get(request.user_id),
        })),
      );
    } catch (error) {
      console.error("Error fetching request inbox:", error);
      toast.error("Failed to load request inbox.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const reviewRequest = async (request: InboxRequest, status: "approved" | "rejected") => {
    setProcessingId(request.id);
    try {
      const { error: requestError } = await supabase
        .from("community_join_requests")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
        })
        .eq("id", request.id);

      if (requestError) {
        throw requestError;
      }

      if (status === "approved") {
        const { data: existingMember } = await supabase
          .from("community_members")
          .select("id")
          .eq("community_id", request.community_id)
          .eq("user_id", request.user_id)
          .maybeSingle();

        if (!existingMember) {
          const { error: memberError } = await supabase.from("community_members").insert({
            community_id: request.community_id,
            user_id: request.user_id,
            role: "member",
          });

          if (memberError) {
            throw memberError;
          }

          const { data: community } = await supabase
            .from("communities")
            .select("member_count")
            .eq("id", request.community_id)
            .single();

          await supabase
            .from("communities")
            .update({ member_count: (community?.member_count ?? 0) + 1 })
            .eq("id", request.community_id);
        }
      }

      fetchInbox();
      toast.success(status === "approved" ? "Request accepted." : "Request rejected.");
    } catch (error) {
      console.error("Error reviewing request from inbox:", error);
      toast.error("Failed to update request.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {requests.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 overflow-hidden">
        <div className="border-b border-border px-4 py-3 bg-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold">Join Requests</p>
              <p className="text-xs text-muted-foreground">Message-style community requests</p>
            </div>
            <Badge variant="secondary">{requests.length}</Badge>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-20 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircleWarning className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No pending requests</p>
              <p className="text-xs text-muted-foreground">New join requests will appear here.</p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="border-b border-border px-4 py-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">
                        {request.username || "New member"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      wants to join {request.communityName || "your community"}
                    </p>
                    <p className="text-sm text-foreground mb-3">
                      {request.message?.trim() || "I would like to join this community."}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => reviewRequest(request, "approved")}
                        disabled={processingId === request.id}
                        className="gradient-bg text-primary-foreground hover:opacity-90"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reviewRequest(request, "rejected")}
                        disabled={processingId === request.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default JoinRequestInbox;
