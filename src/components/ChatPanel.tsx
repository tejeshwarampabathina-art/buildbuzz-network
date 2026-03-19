import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  sender: string;
  avatar?: string;
  text: string;
  time: string;
  isOwn: boolean;
}

const demoMessages: Message[] = [
  { id: "1", sender: "Alex Chen", text: "Hey! I loved your portfolio project 🔥", time: "2:30 PM", isOwn: false },
  { id: "2", sender: "You", text: "Thanks Alex! I spent a lot of time on the animations", time: "2:31 PM", isOwn: true },
  { id: "3", sender: "Alex Chen", text: "Can you share how you did the parallax scroll effect?", time: "2:32 PM", isOwn: false },
  { id: "4", sender: "You", text: "Sure! I used Framer Motion with scroll-linked animations. I can walk you through it", time: "2:33 PM", isOwn: true },
  { id: "5", sender: "Alex Chen", text: "That would be awesome! Maybe we can collab on a project too?", time: "2:34 PM", isOwn: false },
];

const contacts = [
  { name: "Alex Chen", avatar: "", lastMsg: "That would be awesome!", time: "2:34 PM", unread: 2 },
  { name: "Sarah Kim", avatar: "", lastMsg: "Check out my new design!", time: "1:15 PM", unread: 0 },
  { name: "Dev Community", avatar: "", lastMsg: "Mike: Anyone using Rust?", time: "12:00 PM", unread: 5 },
  { name: "Priya Sharma", avatar: "", lastMsg: "Thanks for the review!", time: "Yesterday", unread: 0 },
];

const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "You",
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  const totalUnread = contacts.reduce((sum, c) => sum + c.unread, 0);

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full gradient-bg flex items-center justify-center shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] h-[500px] rounded-2xl border border-border bg-background shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              {activeChat ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveChat(null)} className="text-muted-foreground hover:text-foreground">
                    ←
                  </button>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {activeChat.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{activeChat}</p>
                    <p className="text-xs text-accent">Online</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">Messages</h3>
                  <p className="text-xs text-muted-foreground">{contacts.length} conversations</p>
                </div>
              )}
            </div>

            {activeChat ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          msg.isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-border text-foreground rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className={`text-[10px] mt-1 ${msg.isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border bg-card">
                  <div className="flex items-center gap-2">
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Smile className="h-5 w-5" />
                    </button>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
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
            ) : (
              /* Contact List */
              <div className="flex-1 overflow-y-auto">
                {contacts.map((contact) => (
                  <button
                    key={contact.name}
                    onClick={() => setActiveChat(contact.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                        {contact.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{contact.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{contact.lastMsg}</p>
                    </div>
                    {contact.unread > 0 && (
                      <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {contact.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatPanel;
