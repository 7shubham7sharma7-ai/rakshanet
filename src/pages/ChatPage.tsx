import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, MicOff } from 'lucide-react';
import { useEmergency, ChatMessage as ChatMessageType } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const ChatMessage: React.FC<{ message: ChatMessageType }> = ({ message }) => {
  const isUser = message.senderType === 'user';
  const isSystem = message.senderType === 'system';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {!isSystem && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={`text-xs ${
            isUser ? 'bg-primary text-primary-foreground' : 
            message.senderType === 'helper' ? 'bg-accent text-accent-foreground' : 
            'bg-secondary text-secondary-foreground'
          }`}>
            {message.senderName.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[75%] ${isSystem ? 'w-full' : ''}`}>
        {!isSystem && (
          <p className={`text-xs text-muted-foreground mb-1 ${isUser ? 'text-right' : ''}`}>
            {message.senderName}
          </p>
        )}
        <div className={`rounded-2xl px-4 py-2 ${
          isSystem ? 'bg-warning/10 border border-warning/30 text-warning text-center text-sm' :
          isUser ? 'bg-primary text-primary-foreground rounded-br-md' : 
          'bg-muted text-foreground rounded-bl-md'
        }`}>
          <p className="text-sm">{message.content}</p>
        </div>
        <p className={`text-[10px] text-muted-foreground mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
};

const ChatPage: React.FC = () => {
  const { t } = useLanguage();
  const { isEmergencyActive, currentSession, sendMessage } = useEmergency();
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const mockMessages: ChatMessageType[] = isEmergencyActive && currentSession 
    ? currentSession.messages 
    : [
        {
          id: '1',
          senderId: 'system',
          senderName: 'System',
          senderType: 'system',
          content: 'No active emergency. Chat will be available during emergencies.',
          timestamp: new Date(),
        }
      ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-foreground">{t('emergencyChat')}</h1>
            <p className="text-xs text-muted-foreground">
              {isEmergencyActive 
                ? `${currentSession?.helpers.length || 0} helpers connected` 
                : 'Inactive'}
            </p>
          </div>
          {isEmergencyActive && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-accent font-medium">LIVE</span>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mockMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="sticky bottom-16 bg-background border-t border-border p-4">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsListening(!isListening)}
            className={isListening ? 'text-primary bg-primary/10' : ''}
            disabled={!isEmergencyActive}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          
          <Input
            placeholder={t('typeMessage')}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEmergencyActive}
            className="flex-1"
          />
          
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || !isEmergencyActive}
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ChatPage;
