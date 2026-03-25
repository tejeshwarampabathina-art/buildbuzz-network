import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ConversationSummary {
  partnerId: string;
  lastMessage: string;
  lastAt: string;
}

const displayName = (profile?: Profile) => profile?.username?.trim() || "Unknown user";

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });

const Messages = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [profilesResult, messagesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .neq("id", user.id)
            .order("username", { ascending: true }),
          supabase
            .from("direct_messages")
            .select("id, sender_id, receiver_id, content, created_at")
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order("created_at", { ascending: true }),
        ]);

        if (profilesResult.error) throw profilesResult.error;
        if (messagesResult.error) throw messagesResult.error;

        setProfiles(profilesResult.data || []);
        setMessages(messagesResult.data || []);
      } catch (error) {
        console.error("Error loading direct messages:", error);
        toast.error("Could not load your messages.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`direct-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const incoming = payload.new as DirectMessage;
          if (incoming.sender_id === user.id || incoming.receiver_id === user.id) {
            setMessages((prev) => {
              if (prev.some((item) => item.id === incoming.id)) return prev;
              return [...prev, incoming].sort(
                (a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              );
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile]));
  }, [profiles]);

  const conversations = useMemo(() => {
    if (!user?.id) return [];
    const lookup = new Map<string, ConversationSummary>();

    for (const message of messages) {
      const partnerId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
      const existing = lookup.get(partnerId);

      if (!existing || new Date(message.created_at).getTime() > new Date(existing.lastAt).getTime()) {
        lookup.set(partnerId, {
          partnerId,
          lastMessage: message.content,
          lastAt: message.created_at,
        });
      }
    }

    return Array.from(lookup.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );
  }, [messages, user?.id]);

  useEffect(() => {
    if (!selectedUserId) {
      if (conversations[0]?.partnerId) {
        setSelectedUserId(conversations[0].partnerId);
      } else if (profiles[0]?.id) {
        setSelectedUserId(profiles[0].id);
      }
    }
  }, [conversations, profiles, selectedUserId]);

  const orderedProfiles = useMemo(() => {
    const conversationOrder = new Map(conversations.map((item, index) => [item.partnerId, index]));
    const filtered = profiles.filter((profile) =>
      displayName(profile).toLowerCase().includes(search.trim().toLowerCase()),
    );

    return filtered.sort((a, b) => {
      const aOrder = conversationOrder.get(a.id);
      const bOrder = conversationOrder.get(b.id);

      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return displayName(a).localeCompare(displayName(b));
    });
  }, [conversations, profiles, search]);

  const selectedProfile = selectedUserId ? profileMap.get(selectedUserId) : undefined;

  const currentMessages = useMemo(() => {
    if (!user?.id || !selectedUserId) return [];
    return messages.filter((message) => {
      const mineToSelected = message.sender_id === user.id && message.receiver_id === selectedUserId;
      const selectedToMine = message.sender_id === selectedUserId && message.receiver_id === user.id;
      return mineToSelected || selectedToMine;
    });
  }, [messages, selectedUserId, user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id || !selectedUserId || !input.trim() || isSending) return;

    setIsSending(true);
    const text = input.trim();

    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: user.id,
          receiver_id: selectedUserId,
          content: text,
        })
        .select("id, sender_id, receiver_id, content, created_at")
        .single();

      if (error) throw error;
      if (data) {
        setMessages((prev) => {
          if (prev.some((item) => item.id === data.id)) return prev;
          return [...prev, data];
        });
      }
      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Could not send your message.");
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <div className="h-12 w-32 bg-secondary animate-pulse rounded mb-6" />
          <div className="h-[70vh] rounded-2xl bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <Card className="h-[75vh]">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Direct Messages
              </CardTitle>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search accounts..."
              />
            </CardHeader>
            <CardContent className="p-0 h-[calc(75vh-116px)] overflow-y-auto">
              {orderedProfiles.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6 text-sm text-muted-foreground text-center">
                  No accounts found.
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {orderedProfiles.map((profile) => {
                    const summary = conversations.find((item) => item.partnerId === profile.id);
                    const active = selectedUserId === profile.id;
                    return (
                      <button
                        type="button"
                        key={profile.id}
                        onClick={() => setSelectedUserId(profile.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          active
                            ? "border-primary/50 bg-primary/10"
                            : "border-transparent hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile.avatar_url || ""} alt={displayName(profile)} />
                            <AvatarFallback>{displayName(profile).charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{displayName(profile)}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {summary ? summary.lastMessage : "Start a new chat"}
                            </p>
                          </div>
                          {summary && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(summary.lastAt)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-[75vh] flex flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-3">
                {selectedProfile ? (
                  <>
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={selectedProfile.avatar_url || ""}
                        alt={displayName(selectedProfile)}
                      />
                      <AvatarFallback>
                        {displayName(selectedProfile).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{displayName(selectedProfile)}</span>
                  </>
                ) : (
                  <span>Select an account to chat</span>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-y-auto">
              {!selectedUserId ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Pick an account from the left.
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center px-6">
                  <div>
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm text-muted-foreground">
                      Send the first direct message.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {currentMessages.map((message) => {
                    const isOwn = message.sender_id === user.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-secondary text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isOwn
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              )}
            </CardContent>

            <form onSubmit={sendMessage} className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={
                    selectedUserId ? "Type your message..." : "Select an account first..."
                  }
                  disabled={!selectedUserId || isSending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!selectedUserId || !input.trim() || isSending}
                  className="gradient-bg text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;
