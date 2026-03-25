import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, MessageCircleWarning, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CommunityRequest {
  id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface CommunityRequestsProps {
  communityId: string;
  canManage: boolean;
  currentUserId?: string;
  onRequestHandled?: () => void;
}

const CommunityRequests = ({
  communityId,
  canManage,
  currentUserId,
  onRequestHandled,
}: CommunityRequestsProps) => {
  const [requests, setRequests] = useState<CommunityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("community_join_requests")
        .select("id, user_id, status, message, created_at")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const requestRows = (data ?? []) as CommunityRequest[];
      const userIds = requestRows.map((request) => request.user_id);

      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      setRequests(
        requestRows.map((request) => ({
          ...request,
          profile: profileMap.get(request.user_id),
        })),
      );
    } catch (error) {
      console.error("Error fetching join requests:", error);
      toast.error("Failed to load join requests.");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const reviewRequest = async (request: CommunityRequest, status: "approved" | "rejected") => {
    if (!currentUserId) return;

    setProcessingId(request.id);
    try {
      const { error: requestError } = await supabase
        .from("community_join_requests")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId,
        })
        .eq("id", request.id);

      if (requestError) {
        throw requestError;
      }

      if (status === "approved") {
        const { data: existingMember, error: existingMemberError } = await supabase
          .from("community_members")
          .select("id")
          .eq("community_id", communityId)
          .eq("user_id", request.user_id)
          .maybeSingle();

        if (existingMemberError) {
          throw existingMemberError;
        }

        if (!existingMember) {
          const { error: memberError } = await supabase.from("community_members").insert({
            community_id: communityId,
            user_id: request.user_id,
            role: "member",
          });

          if (memberError) {
            throw memberError;
          }

          const { data: community, error: communityLookupError } = await supabase
            .from("communities")
            .select("member_count")
            .eq("id", communityId)
            .single();

          if (communityLookupError) {
            throw communityLookupError;
          }

          const { error: communityUpdateError } = await supabase
            .from("communities")
            .update({ member_count: (community?.member_count ?? 0) + 1 })
            .eq("id", communityId);

          if (communityUpdateError) {
            throw communityUpdateError;
          }
        }
      }

      toast.success(status === "approved" ? "Join request approved." : "Join request rejected.");
      fetchRequests();
      onRequestHandled?.();
    } catch (error) {
      console.error("Error reviewing join request:", error);
      toast.error("Failed to update join request.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageCircleWarning className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Only community admins can review join requests.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-24 rounded-xl bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  const pendingRequests = requests.filter((request) => request.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Join Requests</h2>
        <p className="text-muted-foreground">
          Requests appear like message threads so admins can review them quickly.
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No join requests yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <div className="h-11 w-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">
                        {(request.profile?.username || "U").slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">
                          {request.profile?.username || "Community member"}
                        </p>
                        <Badge variant={request.status === "pending" ? "secondary" : "outline"}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Requested {new Date(request.created_at).toLocaleString()}
                      </p>
                      <div className="rounded-2xl rounded-tl-md border border-border bg-secondary/40 px-4 py-3">
                        <p className="text-sm text-foreground">
                          {request.message?.trim() || "I would like to join this community."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0">
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
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pendingRequests.length > 0 && (
        <p className="text-sm text-muted-foreground">{pendingRequests.length} pending request(s) need review.</p>
      )}
    </div>
  );
};

export default CommunityRequests;
