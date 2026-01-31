import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MapPin, AlertTriangle, Users, X } from 'lucide-react';
import { useEmergency, EmergencyAlert } from '@/contexts/EmergencyContext';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    isEmergencyActive, 
    currentEmergency, 
    currentChat, 
    chatMessages, 
    sendChatMessage,
    nearbyAlerts,
    joinEmergencyChat,
    resolveEmergency
  } = useEmergency();
  
  const [inputValue, setInputValue] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    await sendChatMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleJoinChat = async (alert: EmergencyAlert) => {
    setSelectedAlert(alert);
    await joinEmergencyChat(alert);
  };

  const isUserMessage = (senderId: string) => senderId === user?.uid;
  const isSystemMessage = (senderId: string) => senderId === 'system';

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-foreground">Emergency Chat</h1>
            <p className="text-xs text-muted-foreground">
              {isEmergencyActive 
                ? 'Your emergency is active' 
                : currentChat 
                ? 'Helping someone in need'
                : 'No active chat'}
            </p>
          </div>
          {(isEmergencyActive || currentChat) && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs text-destructive font-medium">LIVE</span>
            </div>
          )}
        </div>
      </header>

      {/* Show nearby alerts if no active chat */}
      {!currentChat && nearbyAlerts.length > 0 && (
        <div className="p-4 space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Nearby Emergencies
          </h2>
          {nearbyAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{alert.victimName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {(alert as any).distance?.toFixed(1) || '?'} km away
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
                  HELP NEEDED
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleJoinChat(alert)}
                  className="flex-1"
                  variant="destructive"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Join & Help
                </Button>
                <Button
                  variant="outline"
                  asChild
                >
                  <a 
                    href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* No chat message */}
      {!currentChat && nearbyAlerts.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active emergency chats</p>
            <p className="text-sm mt-2">
              When you trigger an emergency or join someone else's,<br />
              the chat will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {currentChat && (
        <>
          {/* Emergency Info Banner */}
          {currentEmergency && (
            <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-destructive" />
                  <a 
                    href={`https://maps.google.com/?q=${currentEmergency.lat},${currentEmergency.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-destructive hover:underline"
                  >
                    View location on map
                  </a>
                </div>
                {isEmergencyActive && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={resolveEmergency}
                    className="text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    End Emergency
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${isUserMessage(msg.senderId) ? 'flex-row-reverse' : ''}`}
              >
                {!isSystemMessage(msg.senderId) && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={`text-xs ${
                      isUserMessage(msg.senderId) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {msg.senderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[75%] ${isSystemMessage(msg.senderId) ? 'w-full' : ''}`}>
                  {!isSystemMessage(msg.senderId) && (
                    <p className={`text-xs text-muted-foreground mb-1 ${
                      isUserMessage(msg.senderId) ? 'text-right' : ''
                    }`}>
                      {msg.senderName}
                    </p>
                  )}
                  <div className={`rounded-2xl px-4 py-2 ${
                    isSystemMessage(msg.senderId) 
                      ? 'bg-warning/10 border border-warning/30 text-warning text-center text-sm' 
                      : isUserMessage(msg.senderId) 
                      ? 'bg-primary text-primary-foreground rounded-br-md' 
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <p className={`text-[10px] text-muted-foreground mt-1 ${
                    isUserMessage(msg.senderId) ? 'text-right' : ''
                  }`}>
                    {msg.timestamp?.toDate ? 
                      new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : 'Now'
                    }
                  </p>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="sticky bottom-16 bg-background border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                size="icon"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default ChatPage;
