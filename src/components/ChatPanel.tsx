import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Users, User, Plus, ArrowLeft, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Conversation {
  id: string;
  type: "dm" | "community";
  name: string | null;
  community_id: string | null;
  updated_at: string;
  last_message?: string;
  last_sender?: string;
  other_user?: { id: string; username: string | null };
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_username?: string;
}

type Tab = "dms" | "communities";
type View = "list" | "chat" | "new-dm" | "community-list";

const ChatPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("dms");
  const [view, setView] = useState<View>("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [communityConversations, setCommunityConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [allUsers, setAllUsers] = useState<{ id: string; username: string | null }[]>([]);
  const [allCommunities, setAllCommunities] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch DM conversations
  const fetchDMs = useCallback(async () => {
    if (!user) return;
    const { data: memberRows } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);
    if (!memberRows?.length) { setConversations([]); return; }

    const convIds = memberRows.map((r) => r.conversation_id);
    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .eq("type", "dm")
      .order("updated_at", { ascending: false });

    if (!convos) { setConversations([]); return; }

    // Get other members for each DM
    const enriched: Conversation[] = [];
    for (const c of convos) {
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", c.id)
        .neq("user_id", user.id);
      
      let otherUser: { id: string; username: string | null } | undefined;
      if (members?.[0]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("id", members[0].user_id)
          .single();
        if (profile) otherUser = profile;
      }

      // Get last message
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, sender_id")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1);

      enriched.push({
        ...c,
        type: c.type as "dm" | "community",
        other_user: otherUser,
        last_message: lastMsg?.[0]?.content,
        last_sender: lastMsg?.[0]?.sender_id === user.id ? "You" : otherUser?.username || "User",
      });
    }
    setConversations(enriched);
  }, [user]);

  // Fetch community conversations
  const fetchCommunityConvos = useCallback(async () => {
    if (!user) return;
    const { data: memberRows } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    const joinedIds = memberRows?.map((r) => r.conversation_id) || [];

    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .eq("type", "community")
      .order("updated_at", { ascending: false });

    if (!convos) { setCommunityConversations([]); return; }

    // Get community names
    const enriched: Conversation[] = [];
    for (const c of convos) {
      if (!joinedIds.includes(c.id)) continue;
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, sender_id")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1);

      let senderName = "";
      if (lastMsg?.[0]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", lastMsg[0].sender_id)
          .single();
        senderName = profile?.username || "User";
      }

      enriched.push({
        ...c,
        type: c.type as "dm" | "community",
        last_message: lastMsg?.[0]?.content,
        last_sender: senderName,
      });
    }
    setCommunityConversations(enriched);
  }, [user]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!data) return;

    // Enrich with usernames
    const senderIds = [...new Set(data.map((m) => m.sender_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", senderIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.username]) || []);
    setMessages(
      data.map((m) => ({
        ...m,
        sender_username: profileMap.get(m.sender_id) || "User",
      }))
    );
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!activeConversation) return;
    const channel = supabase
      .channel(`messages-${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", msg.sender_id)
            .single();
          setMessages((prev) => [
            ...prev,
            { ...msg, sender_username: profile?.username || "User" },
          ]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversation]);

  useEffect(() => {
    if (isOpen && user) {
      fetchDMs();
      fetchCommunityConvos();
    }
  }, [isOpen, user, fetchDMs, fetchCommunityConvos]);

  const openChat = async (conv: Conversation) => {
    setActiveConversation(conv);
    setView("chat");
    await fetchMessages(conv.id);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConversation || !user) return;
    const content = input.trim();
    setInput("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConversation.id,
      sender_id: user.id,
      content,
    });
    if (error) toast.error("Failed to send message");

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", activeConversation.id);
  };

  // Start DM with a user
  const startDM = async (otherUserId: string) => {
    if (!user) return;
    setLoading(true);

    // Check if DM already exists
    const { data: myConvs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvs) {
      for (const mc of myConvs) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", mc.conversation_id)
          .eq("type", "dm")
          .single();
        if (!conv) continue;
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .eq("user_id", otherUserId)
          .single();
        if (otherMember) {
          // Existing DM found
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username")
            .eq("id", otherUserId)
            .single();
          setActiveConversation({
            ...conv,
            type: conv.type as "dm" | "community",
            other_user: profile || undefined,
          });
          setView("chat");
          await fetchMessages(conv.id);
          setLoading(false);
          return;
        }
      }
    }

    // Create new DM
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({ type: "dm" })
      .select()
      .single();
    if (error || !newConv) { toast.error("Failed to create conversation"); setLoading(false); return; }

    await supabase.from("conversation_members").insert([
      { conversation_id: newConv.id, user_id: user.id },
      { conversation_id: newConv.id, user_id: otherUserId },
    ]);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", otherUserId)
      .single();

    setActiveConversation({
      ...newConv,
      type: newConv.type as "dm" | "community",
      other_user: profile || undefined,
    });
    setView("chat");
    await fetchMessages(newConv.id);
    setLoading(false);
  };

  // Join community chat
  const joinCommunityChat = async (communityId: string, communityName: string) => {
    if (!user) return;
    setLoading(true);

    // Check if community conversation exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("community_id", communityId)
      .eq("type", "community")
      .single();

    let conv = existing;
    if (!conv) {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({ type: "community", community_id: communityId, name: communityName })
        .select()
        .single();
      if (error || !newConv) { toast.error("Failed to create chat"); setLoading(false); return; }
      conv = newConv;
    }

    // Join if not already a member
    await supabase.from("conversation_members").upsert(
      { conversation_id: conv.id, user_id: user.id },
      { onConflict: "conversation_id,user_id" }
    );

    setActiveConversation({ ...conv, type: conv.type as "dm" | "community" });
    setView("chat");
    await fetchMessages(conv.id);
    await fetchCommunityConvos();
    setLoading(false);
  };

  // Fetch users for new DM
  const fetchUsers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .neq("id", user.id)
      .order("username");
    setAllUsers(data || []);
  };

  // Fetch communities for joining
  const fetchCommunitiesList = async () => {
    const { data } = await supabase
      .from("communities")
      .select("id, name")
      .order("name");
    setAllCommunities(data || []);
  };

  const chatName = activeConversation?.type === "dm"
    ? activeConversation.other_user?.username || "User"
    : activeConversation?.name || "Community";

  if (!user) {
    return (
      <>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/auth")}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full gradient-bg flex items-center justify-center shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
        >
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        </motion.button>
      </>
    );
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full gradient-bg flex items-center justify-center shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] h-[540px] rounded-2xl border border-border bg-background shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              {view === "chat" && activeConversation ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => { setView("list"); setActiveConversation(null); fetchDMs(); fetchCommunityConvos(); }} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {activeConversation.type === "community" ? <Hash className="h-4 w-4" /> : chatName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{chatName}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeConversation.type === "community" ? "Community Chat" : "Direct Message"}
                    </p>
                  </div>
                </div>
              ) : view === "new-dm" ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h3 className="font-display text-sm font-bold text-foreground">New Message</h3>
                </div>
              ) : view === "community-list" ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h3 className="font-display text-sm font-bold text-foreground">Join Community Chat</h3>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <h3 className="font-display text-lg font-bold text-foreground">Messages</h3>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setView("new-dm"); fetchUsers(); setSearchQuery(""); }}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs (only on list view) */}
            {view === "list" && (
              <div className="flex border-b border-border bg-card">
                <button
                  onClick={() => setTab("dms")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    tab === "dms" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="h-4 w-4 inline mr-1.5" />
                  Direct
                </button>
                <button
                  onClick={() => setTab("communities")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    tab === "communities" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="h-4 w-4 inline mr-1.5" />
                  Communities
                </button>
              </div>
            )}

            {/* Content */}
            {view === "list" && tab === "dms" && (
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="h-7 w-7 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    <Button size="sm" onClick={() => { setView("new-dm"); fetchUsers(); setSearchQuery(""); }} className="gradient-bg text-primary-foreground">
                      <Plus className="h-4 w-4 mr-1" /> Start a Chat
                    </Button>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => openChat(conv)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                          {(conv.other_user?.username || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {conv.other_user?.username || "User"}
                        </p>
                        {conv.last_message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_sender}: {conv.last_message}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {view === "list" && tab === "communities" && (
              <div className="flex-1 overflow-y-auto">
                {communityConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-4">
                    <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center">
                      <Users className="h-7 w-7 text-accent" />
                    </div>
                    <p className="text-sm text-muted-foreground">No community chats joined</p>
                    <Button size="sm" onClick={() => { setView("community-list"); fetchCommunitiesList(); setSearchQuery(""); }} className="gradient-bg text-primary-foreground">
                      <Plus className="h-4 w-4 mr-1" /> Join a Community
                    </Button>
                  </div>
                ) : (
                  <>
                    {communityConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => openChat(conv)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50"
                      >
                        <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                          <Hash className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{conv.name}</p>
                          {conv.last_message && (
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.last_sender}: {conv.last_message}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                    <div className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setView("community-list"); fetchCommunitiesList(); setSearchQuery(""); }}
                        className="w-full border-border text-foreground"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Join Another Community
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* New DM - user picker */}
            {view === "new-dm" && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 rounded-lg bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                {allUsers
                  .filter((u) => !searchQuery || u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => startDM(u.id)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50 disabled:opacity-50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                          {(u.username || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-semibold text-foreground">{u.username || "User"}</p>
                    </button>
                  ))}
                {allUsers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
                )}
              </div>
            )}

            {/* Community picker */}
            {view === "community-list" && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3">
                  <input
                    type="text"
                    placeholder="Search communities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 rounded-lg bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                {allCommunities
                  .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => joinCommunityChat(c.id, c.name)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50 disabled:opacity-50"
                    >
                      <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <Hash className="h-5 w-5 text-accent" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    </button>
                  ))}
                {allCommunities.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No communities found</p>
                )}
              </div>
            )}

            {/* Chat view */}
            {view === "chat" && activeConversation && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                      <p className="text-sm text-muted-foreground">No messages yet. Say hi! 👋</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] ${isOwn ? "" : "flex gap-2"}`}>
                          {!isOwn && activeConversation.type === "community" && (
                            <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                              <AvatarFallback className="bg-accent/20 text-accent text-[10px] font-bold">
                                {(msg.sender_username || "U").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            {!isOwn && activeConversation.type === "community" && (
                              <p className="text-[11px] text-muted-foreground mb-0.5 ml-1">
                                {msg.sender_username}
                              </p>
                            )}
                            <div
                              className={`rounded-2xl px-4 py-2.5 ${
                                isOwn
                                  ? "gradient-bg text-primary-foreground rounded-br-md"
                                  : "bg-card border border-border text-foreground rounded-bl-md"
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-border bg-card">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 h-9 rounded-lg bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <Button
                      size="icon"
                      onClick={sendMessage}
                      disabled={!input.trim()}
                      className="h-9 w-9 gradient-bg text-primary-foreground rounded-lg disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatPanel;
