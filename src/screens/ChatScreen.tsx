import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { chatAPI, healthAPI, foodAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const QUICK_PROMPTS = [
  "Why is my energy low today?",
  "Tips for better sleep",
  "What should I eat for energy?",
  "Explain my symptoms",
];

// Simple markdown text renderer
const SimpleMarkdown = ({ children, style }: { children: string; style?: any }) => {
  const parseText = (text: string) => {
    const elements: React.ReactNode[] = [];
    let key = 0;

    // Split by lines first to handle lists
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // Check for bullet points
      const bulletMatch = line.match(/^[\s]*[-•*]\s+(.+)$/);
      const numberedMatch = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
      
      if (bulletMatch) {
        elements.push(
          <Text key={key++} style={[styles.markdownText, style]}>
            {'  • '}{parseInlineStyles(bulletMatch[1])}
            {lineIndex < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      } else if (numberedMatch) {
        elements.push(
          <Text key={key++} style={[styles.markdownText, style]}>
            {'  '}{numberedMatch[1]}. {parseInlineStyles(numberedMatch[2])}
            {lineIndex < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      } else {
        elements.push(
          <Text key={key++} style={[styles.markdownText, style]}>
            {parseInlineStyles(line)}
            {lineIndex < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      }
    });

    return elements;
  };

  const parseInlineStyles = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Italic: *text* or _text_
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)|_([^_]+?)_/);
      // Code: `text`
      const codeMatch = remaining.match(/`([^`]+?)`/);

      // Find the earliest match
      const matches = [
        { type: 'bold', match: boldMatch, index: boldMatch?.index ?? Infinity },
        { type: 'italic', match: italicMatch, index: italicMatch?.index ?? Infinity },
        { type: 'code', match: codeMatch, index: codeMatch?.index ?? Infinity },
      ].filter(m => m.match).sort((a, b) => a.index - b.index);

      if (matches.length === 0 || matches[0].index === Infinity) {
        elements.push(remaining);
        break;
      }

      const first = matches[0];
      const matchIndex = first.index;

      // Add text before match
      if (matchIndex > 0) {
        elements.push(remaining.substring(0, matchIndex));
      }

      // Add styled text
      if (first.type === 'bold' && first.match) {
        elements.push(
          <Text key={key++} style={styles.boldText}>{first.match[1]}</Text>
        );
        remaining = remaining.substring(matchIndex + first.match[0].length);
      } else if (first.type === 'italic' && first.match) {
        const content = first.match[1] || first.match[2];
        elements.push(
          <Text key={key++} style={styles.italicText}>{content}</Text>
        );
        remaining = remaining.substring(matchIndex + first.match[0].length);
      } else if (first.type === 'code' && first.match) {
        elements.push(
          <Text key={key++} style={styles.codeText}>{first.match[1]}</Text>
        );
        remaining = remaining.substring(matchIndex + first.match[0].length);
      }
    }

    return elements;
  };

  return <Text style={[styles.markdownText, style]}>{parseText(children)}</Text>;
};

// Animated typing dots component
const TypingDots = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const getStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [{
      scale: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1],
      }),
    }],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, getStyle(dot1)]} />
      <Animated.View style={[styles.dot, getStyle(dot2)]} />
      <Animated.View style={[styles.dot, getStyle(dot3)]} />
    </View>
  );
};

export default function ChatScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [healthContext, setHealthContext] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const initializedRef = useRef(false);

  // Reset chat when screen comes into focus (navigating back)
  useFocusEffect(
    useCallback(() => {
      // Reset the initialized flag so chat reinitializes
      initializedRef.current = false;
      initializeChat();
      
      return () => {
        // Cleanup when leaving - optional
      };
    }, [])
  );

  const initializeChat = async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const [today, foodData] = await Promise.all([
        healthAPI.getToday(),
        foodAPI.getLogs().catch(() => ({ foodLogs: [], totals: null })),
      ]);
      
      // Combine health and food data into context
      const context = {
        ...today,
        foodLogs: foodData.foodLogs || [],
        foodTotals: foodData.totals || null,
      };
      setHealthContext(context);
      
      // Set personalized welcome message based on health data
      let welcomeContent = `Hi ${user?.name || 'there'}! `;
      if (today?.energyLevel !== null && today?.energyLevel < 5) {
        welcomeContent += "I notice your energy is a bit low today. Let's talk about what might help - whether it's nutrition, rest, or gentle movement. How are you feeling?";
      } else if (today?.energyLevel !== null && today?.energyLevel >= 7) {
        welcomeContent += "Your energy looks great today! That's wonderful. I'm here if you want to maintain this momentum or explore new wellness habits.";
      } else {
        welcomeContent += "I'm here to help you track and understand your wellness. You can log your daily metrics or ask me anything about your health, energy, sleep, or nutrition.";
      }
      
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      // Set default welcome message on error
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hi ${user?.name || 'there'}! I'm here to help you track and understand your wellness. You can log your daily metrics or ask me anything about your health, energy, sleep, or nutrition.`,
        timestamp: new Date(),
      }]);
    }
  };

  const refreshHealthContext = async () => {
    try {
      const [today, foodData] = await Promise.all([
        healthAPI.getToday(),
        foodAPI.getLogs().catch(() => ({ foodLogs: [], totals: null })),
      ]);
      
      const context = {
        ...today,
        foodLogs: foodData.foodLogs || [],
        foodTotals: foodData.totals || null,
      };
      setHealthContext(context);
    } catch (error) {
      console.error('Failed to refresh health context:', error);
    }
  };

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const clearChat = () => {
    const welcomeMessage: Message = {
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: `Hi ${user?.name || 'there'}! I'm here to help you track and understand your wellness. You can log your daily metrics or ask me anything about your health, energy, sleep, or nutrition.`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      const response = await chatAPI.sendQuickMessage(userMessage.content, healthContext);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(response.timestamp),
      };

      setMessages((prev) => [...prev, aiMessage]);
      scrollToEnd();

      if (response.dataExtracted) {
        await refreshHealthContext();
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Image
              source={require('../../assets/icon-120.png')}
              style={styles.avatarImage}
            />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          {isUser ? (
            <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
            {item.content}
          </Text>
          ) : (
            <SimpleMarkdown>{item.content}</SimpleMarkdown>
          )}
          <Text style={[styles.time, isUser && styles.timeUser]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isUser && (
          <View style={styles.avatarUser}>
            <Text style={styles.avatarUserText}>You</Text>
          </View>
        )}
      </View>
    );
  };

  const renderThinking = () => {
    if (!sending) return null;
    return (
      <View style={styles.messageRow}>
          <View style={styles.avatar}>
            <Image
              source={require('../../assets/icon-120.png')}
              style={styles.avatarImage}
            />
          </View>
        <View style={[styles.bubble, styles.bubbleAI, styles.thinkingBubble]}>
          <TypingDots />
        </View>
      </View>
    );
  };

  const showQuickPrompts = messages.length <= 2;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Image
            source={require('../../assets/icon-120.png')}
            style={styles.headerIconImage}
          />
        </View>
        <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Wellness Assistant</Text>
          <Text style={styles.headerSubtitle}>Ask about your health data</Text>
          </View>
        {messages.length > 1 && (
          <TouchableOpacity 
            onPress={clearChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearBtn}
          >
            <Ionicons name="trash-outline" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
        </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          style={styles.list}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={renderThinking}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        />

        {/* Quick Prompts - between messages and input */}
        {showQuickPrompts && (
          <View style={styles.quickSection}>
            <Text style={styles.quickLabel}>QUICK PROMPTS</Text>
            <View style={styles.quickGrid}>
              {QUICK_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.quickBtn}
                  onPress={() => handleSend(prompt)}
                  disabled={sending}
                >
                  <Text style={styles.quickBtnText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your wellness..."
            placeholderTextColor="#9ca3af"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerIconImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  clearBtn: {
    padding: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  messageRowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarUser: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#174D3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUserText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAI: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#174D3A',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#0f172a',
  },
  bubbleTextUser: {
    color: '#fff',
  },
  markdownText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#0f172a',
  },
  boldText: {
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
  codeText: {
    backgroundColor: '#e2e8f0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  time: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },
  timeUser: {
    color: 'rgba(255,255,255,0.6)',
  },
  thinkingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  quickSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickBtnText: {
    fontSize: 13,
    color: '#4b5563',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#174D3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
