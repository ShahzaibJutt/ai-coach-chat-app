import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { StreamChat } from 'stream-chat';
import { useAuth } from './AuthContext';

const StreamChatContext = createContext();

export function useStreamChat() {
  return useContext(StreamChatContext);
}

export function StreamChatProvider({ children }) {
  const { currentUser } = useAuth();
  const [chatClient, setChatClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const clientRef = useRef(null);
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    // Only initialize if we have a user and don't already have a connected client
    if (currentUser && currentUser.token && !hasConnectedRef.current) {
      const initChat = async () => {
        try {
          setLoading(true);
          console.log('Initializing Stream Chat with user:', currentUser);
          
          // Create a new client instance if we don't have one
          if (!clientRef.current) {
            clientRef.current = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY);
          }
          
          // Connect user to Stream Chat
          await clientRef.current.connectUser(
            {
              id: currentUser.userId,
              name: currentUser.userId,
            },
            currentUser.token
          );
          
          console.log('Successfully connected to Stream Chat');
          setChatClient(clientRef.current);
          hasConnectedRef.current = true;
        } catch (error) {
          console.error('Error connecting to Stream Chat:', error);
          // If there's an error, set the client to null
          setChatClient(null);
          clientRef.current = null;
          hasConnectedRef.current = false;
        } finally {
          setLoading(false);
        }
      };
      
      initChat();
    } else if (!currentUser) {
      // If user logs out, disconnect
      if (clientRef.current && hasConnectedRef.current) {
        console.log('Disconnecting Stream Chat user due to logout');
        clientRef.current.disconnectUser()
          .then(() => {
            console.log('Successfully disconnected from Stream Chat');
            setChatClient(null);
            hasConnectedRef.current = false;
          })
          .catch(error => {
            console.error('Error disconnecting from Stream Chat:', error);
          });
      } else {
        setChatClient(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    
    // Cleanup function - only disconnect when component unmounts
    return () => {
      if (clientRef.current && hasConnectedRef.current) {
        console.log('Disconnecting Stream Chat user on unmount');
        clientRef.current.disconnectUser()
          .then(() => {
            console.log('Successfully disconnected from Stream Chat on unmount');
          })
          .catch(error => {
            console.error('Error disconnecting from Stream Chat on unmount:', error);
          });
      }
    };
  }, [currentUser]);

  const value = {
    chatClient,
    loading
  };

  return (
    <StreamChatContext.Provider value={value}>
      {children}
    </StreamChatContext.Provider>
  );
} 