import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isOwn: boolean;
}

const CommunityConversation = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "You",
        text: input.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isOwn: true,
      },
    ]);
    setInput("");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Conversation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="min-h-[420px] max-h-[520px] overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="min-h-[380px] flex items-center justify-center text-center px-6">
              <div>
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium text-foreground mb-1">No conversation yet</p>
                <p className="text-sm text-muted-foreground">
                  Start the first discussion for this community.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    message.isOwn
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      message.isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {message.time}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

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
              placeholder="Message the community..."
              className="flex-1 h-10 rounded-lg bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim()}
              className="h-10 w-10 gradient-bg text-primary-foreground rounded-lg disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunityConversation;
