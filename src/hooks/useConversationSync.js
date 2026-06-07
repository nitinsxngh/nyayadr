import { useEffect, useRef } from 'react';
import { updateConversation } from '../services/apiService';

/** Debounced sync of transcript to MongoDB */
export const useConversationSync = (conversationId, transcript, enabled = true) => {
  const timerRef = useRef(null);
  const lastSavedRef = useRef('');

  useEffect(() => {
    if (!enabled || !conversationId || !transcript) return;

    const payload = JSON.stringify(transcript);
    if (payload === lastSavedRef.current) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await updateConversation(conversationId, { transcript });
        lastSavedRef.current = payload;
      } catch (err) {
        console.warn('Failed to sync transcript:', err.message);
      }
    }, 2000);

    return () => clearTimeout(timerRef.current);
  }, [conversationId, transcript, enabled]);
};

export const saveConversation = async (conversationId, payload) => {
  if (!conversationId) return;
  await updateConversation(conversationId, payload);
};
