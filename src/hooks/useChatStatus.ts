/**
 * useChatStatus Hook
 * 
 * Monitors chat status and provides computed states for:
 * - Whether the chat is active
 * - Whether the chat has expired
 * - Whether the chat is resolved
 * - Read-only state
 */

import { useMemo } from 'react';
import { Chat } from '@/contexts/EmergencyContext';

export interface ChatStatus {
  isActive: boolean;
  isExpired: boolean;
  isResolved: boolean;
  isReadOnly: boolean;
  statusMessage: string | null;
}

export const useChatStatus = (chat: Chat | null): ChatStatus => {
  return useMemo(() => {
    if (!chat) {
      return {
        isActive: false,
        isExpired: false,
        isResolved: false,
        isReadOnly: true,
        statusMessage: null,
      };
    }

    const now = new Date();
    const expiresAt = chat.expiresAt?.toDate?.();
    const isExpired = expiresAt ? now > expiresAt : false;
    const isActive = chat.activeStatus === true;
    const isResolved = !isActive && !isExpired;
    const isReadOnly = !isActive || isExpired;

    let statusMessage: string | null = null;
    if (isExpired) {
      statusMessage = '⏰ This emergency chat has expired after 1 hour.';
    } else if (isResolved) {
      statusMessage = '✅ This emergency has been resolved.';
    }

    return {
      isActive,
      isExpired,
      isResolved,
      isReadOnly,
      statusMessage,
    };
  }, [chat]);
};
