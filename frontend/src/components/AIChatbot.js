/**
 * AI Chatbot Component
 * Feature 3: Conversational AI assistant for bookings and support
 */

import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../services/aiService';
import { apiRequest } from '../api';
import '../styles/ai-chatbot.css';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeMessageShown, setWelcomeMessageShown] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }

    // Load smart welcome message when chat opens
    if (isOpen && !welcomeMessageShown) {
      loadWelcomeMessage();
      setWelcomeMessageShown(true);
    }
  }, [isOpen]);

  // Load personalized welcome message
  const loadWelcomeMessage = async () => {
    setIsLoading(true);
    try {
      const response = await chatWithAI('INIT_WELCOME', []);
      setMessages([
        {
          role: 'assistant',
          content: response.reply,
          suggestions: response.suggestions || [],
          actions: response.actions || []
        }
      ]);
    } catch (error) {
      console.error('Welcome message error:', error);
      setMessages([
        {
          role: 'assistant',
          content: 'Hi! 👋 I\'m your ParkEasy AI assistant. How can I help you find parking today?'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick action clicks (don't show in chat, directly send)
  const handleQuickAction = async (actionText) => {
    setIsLoading(true);

    try {
      // Don't add to visible messages, directly get AI response
      const conversationHistory = messages.slice(1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await chatWithAI(actionText, conversationHistory);

      // Add AI response only
      setMessages([
        ...messages,
        {
          role: 'assistant',
          content: response.reply,
          needsSupport: response.needsHumanSupport,
          suggestions: response.suggestions || [],
          actions: response.actions || []
        }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([
        ...messages,
        {
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again or contact support.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message to chat
    const newMessages = [
      ...messages,
      { role: 'user', content: userMessage }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Format conversation history for API
      const conversationHistory = newMessages.slice(1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await chatWithAI(userMessage, conversationHistory);

      // Add AI response to chat with actions and suggestions
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: response.reply,
          needsSupport: response.needsHumanSupport,
          suggestions: response.suggestions || [],
          actions: response.actions || []
        }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again or contact support.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? The refund will be added to your wallet.')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiRequest(`/booking/cancel/${bookingId}`, 'DELETE');

      // Show success message in chat
      setMessages([
        ...messages,
        {
          role: 'assistant',
          content: `✅ ${response.message}\n\n💰 Wallet Balance: ₹${response.walletBalance}\n💵 Refund Amount: ₹${response.refundAmount}`,
          suggestions: ['View my bookings', 'Check wallet balance', 'Find new parking']
        }
      ]);

      // Reload welcome message to refresh booking status
      setTimeout(() => {
        setWelcomeMessageShown(false);
        loadWelcomeMessage();
      }, 2000);
    } catch (error) {
      console.error('Cancel booking error:', error);
      setMessages([
        ...messages,
        {
          role: 'assistant',
          content: `❌ Failed to cancel booking: ${error.message}`,
          suggestions: ['Try again', 'Contact support']
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: '🔍 Find parking', action: 'I want to find parking near me' },
    { label: '📅 My bookings', action: 'Show my bookings' },
    { label: '🏢 All locations', action: 'Show all parking locations' },
    { label: '💰 Wallet', action: 'Show my wallet balance' }
  ];

  return (
    <>
      {/* Chat Toggle Button */}
      <button 
        className={`chat-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="header-content">
              <span className="bot-avatar">🤖</span>
              <div className="header-text">
                <h3>ParkEasy AI Assistant</h3>
                <span className="status-indicator">● Online</span>
              </div>
            </div>
            <button 
              className="minimize-btn"
              onClick={() => setIsOpen(false)}
            >
              −
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message ${msg.role}`}
              >
                <div className="message-content">
                  {msg.content}
                </div>

                {/* Action Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="action-buttons">
                    {msg.actions.map((action, actionIdx) => {
                      // City Location Cards
                      if (action.type === 'show_city_locations' && action.data) {
                        return (
                          <div key={actionIdx} className="action-card location-card">
                            <h4>📍 {action.city}</h4>
                            <div className="location-grid">
                              {action.data.map((loc, locIdx) => (
                                <div key={locIdx} className="location-box">
                                  <div className="location-header">
                                    <span className="location-name">{loc.name}</span>
                                    <span className="location-price">₹{loc.price}/hr</span>
                                  </div>
                                  <div className="location-address">{loc.address}</div>
                                  <div className="location-capacity">
                                    <span>🚗 {loc.carSlots} cars</span>
                                    <span>🏍️ {loc.bikeSlots} bikes</span>
                                  </div>
                                  <button className="book-now-btn" onClick={() => window.location.href = '/parking-cards'}>
                                    Book Now
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Active Bookings Cards
                      if (action.type === 'show_active_bookings' && action.data) {
                        return (
                          <div key={actionIdx} className="action-card booking-card">
                            <h4>🎫 Your Active Bookings</h4>
                            {action.data.map((booking, bookIdx) => (
                              <div key={bookIdx} className="booking-box active">
                                <div className="booking-header">
                                  <span className="booking-property">{booking.propertyName}</span>
                                  <span className={`booking-status ${booking.canCancel ? 'cancellable' : 'locked'}`}>
                                    {booking.canCancel ? '⚠️ Can Cancel' : '🔒 Locked'}
                                  </span>
                                </div>
                                <div className="booking-details">
                                  <div>📍 {booking.address}</div>
                                  <div>🅿️ Slot: {booking.slotNumber}</div>
                                  <div>⏰ Ends: {new Date(booking.endTime).toLocaleString()}</div>
                                </div>
                                {booking.canCancel && (
                                  <button
                                    className="cancel-btn"
                                    onClick={() => handleCancelBooking(booking.bookingId)}
                                  >
                                    Cancel Booking
                                  </button>
                                )}
                                {!booking.canCancel && (
                                  <div className="cancel-note">❌ Cannot cancel (10 min window passed)</div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      }

                      // Recent Bookings History
                      if (action.type === 'show_recent_bookings' && action.data) {
                        return (
                          <div key={actionIdx} className="action-card history-card">
                            <h4>📋 Recent Bookings</h4>
                            {action.data.map((booking, bookIdx) => (
                              <div key={bookIdx} className="booking-box history">
                                <div className="booking-row">
                                  <span className="property-name">{booking.propertyName}</span>
                                  <span className="booking-amount">₹{booking.amount}</span>
                                </div>
                                <div className="booking-row small">
                                  <span>{new Date(booking.date).toLocaleDateString()}</span>
                                  <span className={`status ${booking.status.toLowerCase()}`}>{booking.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}

                {/* Suggestion Chips - Direct Action */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="suggestion-chips">
                    {msg.suggestions.map((suggestion, suggIdx) => (
                      <button
                        key={suggIdx}
                        className="suggestion-chip"
                        onClick={() => handleQuickAction(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {msg.needsSupport && (
                  <div className="support-tag">
                    <a href="/contact">Contact Support →</a>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="quick-actions">
              {quickActions.map((qa, idx) => (
                <button
                  key={idx}
                  className="quick-action-btn"
                  onClick={() => handleQuickAction(qa.action)}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-btn"
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
