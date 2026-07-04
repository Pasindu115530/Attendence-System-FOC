import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { post } from '../api';

const { width, height } = Dimensions.get('window');

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      _id: 1,
      text: 'Hello! I am your AI Attendance Assistant. How can I help you today?',
      createdAt: new Date(),
      user: { _id: 2, name: 'AI Assistant' },
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);
  
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave1Anim, { toValue: 15, duration: 4000, useNativeDriver: true }),
        Animated.timing(wave1Anim, { toValue: 0, duration: 4000, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(wave2Anim, { toValue: -15, duration: 3500, useNativeDriver: true }),
        Animated.timing(wave2Anim, { toValue: 0, duration: 3500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg = {
      _id: Date.now(),
      text: inputText.trim(),
      createdAt: new Date(),
      user: { _id: 1, name: 'User' },
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const history = messages
      .filter(m => m._id !== 1)
      .map(m => ({
        role: m.user._id === 1 ? 'user' : 'model',
        parts: [m.text]
      }));

    try {
      const response = await post('/api/agent/chat', {
        message: userMsg.text,
        history: history
      });

      console.log('AI Response:', response);

      if (response && response.reply) {
        const aiMsg = {
          _id: Date.now() + 1,
          text: response.reply,
          createdAt: new Date(),
          user: { _id: 2, name: 'AI Assistant' },
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errMsg = {
          _id: Date.now() + 1,
          text: response.error || 'I am sorry, something went wrong while processing your request.',
          createdAt: new Date(),
          user: { _id: 2, name: 'AI Assistant' },
        };
        setMessages(prev => [...prev, errMsg]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errMsg = {
        _id: Date.now() + 1,
        text: 'Network error. Please try again later.',
        createdAt: new Date(),
        user: { _id: 2, name: 'AI Assistant' },
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.user._id === 1;

    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <MaterialCommunityIcons name="robot-outline" size={20} color="#fff" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAI]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#029A84', '#007A68', '#004D40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <Animated.View style={[styles.topWave1, { transform: [{ translateY: wave1Anim }] }]} pointerEvents="none" />
        <Animated.View style={[styles.topWave2, { transform: [{ translateY: wave2Anim }] }]} pointerEvents="none" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="robot-outline" size={24} color="#5eead4" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>AI Assistant</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item._id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.flatListContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#5eead4" />
              <Text style={styles.loadingText}>AI is typing...</Text>
            </View>
          )}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask me anything..."
              placeholderTextColor="#9ca3af"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]} 
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <MaterialCommunityIcons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  topWave1: { position: 'absolute', width: width * 1.8, height: width * 1.8, borderRadius: width * 0.9, top: -width * 1.1, left: -width * 0.4, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  topWave2: { position: 'absolute', width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, top: -width * 1.05, left: -width * 0.1, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  chatContainer: { flex: 1, paddingHorizontal: 16 },
  flatListContent: { paddingVertical: 20, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  bubbleUser: { backgroundColor: '#fff', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: 'rgba(255,255,255,0.15)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextUser: { color: '#004D40' },
  messageTextAI: { color: '#fff' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 40, marginBottom: 20 },
  loadingText: { color: '#5eead4', marginLeft: 8, fontSize: 14, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  textInput: { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: '#fff', borderRadius: 23, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, fontSize: 16, color: '#1f2937' },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#007A68', justifyContent: 'center', alignItems: 'center', marginLeft: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
});
