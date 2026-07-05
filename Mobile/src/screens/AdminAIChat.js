import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';

export default function AdminAIChat({ navigation }) {
  const [messages, setMessages] = useState([
    { id: '1', role: 'model', content: "Hello! I'm your Smart Admin Assistant. How can I help you today?" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  const promptChips = [
    "Today's attendance",
    "Add a student",
    "Schedule a lecture",
    "Show timetable",
    "Available halls"
  ];

  const handleSend = async (text = inputText) => {
    if (!text.trim()) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Prepare history excluding the current message for context
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const res = await post('/api/agent/chat', {
        message: text.trim(),
        history: history
      });

      if (res.status === 'success' || res.reply) {
          const replyText = res.reply || res.data?.reply || "Done!";
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: replyText }]);
      } else {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "Sorry, I encountered an error processing your request." }]);
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "Network error connecting to the assistant." }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages update
    if (scrollViewRef.current) {
        setTimeout(() => {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }, 100);
    }
  }, [messages, isTyping]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={['#7e22ce', '#9333ea', '#a855f7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="robot-outline" size={28} color="#fff" style={{marginRight: 8}}/>
            <View>
                <Text style={styles.headerTitle}>AI Assistant</Text>
                <Text style={styles.headerSubtitle}>Powered by Gemini</Text>
            </View>
        </View>
      </LinearGradient>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.bubbleWrapper, msg.role === 'user' ? styles.bubbleUserWrapper : styles.bubbleModelWrapper]}>
            {msg.role === 'model' && (
              <View style={styles.modelAvatar}>
                <MaterialCommunityIcons name="robot-outline" size={18} color="#fff" />
              </View>
            )}
            <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.modelBubble]}>
              <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.modelText]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}
        {isTyping && (
           <View style={[styles.bubbleWrapper, styles.bubbleModelWrapper]}>
             <View style={styles.modelAvatar}>
               <MaterialCommunityIcons name="robot-outline" size={18} color="#fff" />
             </View>
             <View style={[styles.bubble, styles.modelBubble, { paddingVertical: 12 }]}>
                <ActivityIndicator size="small" color="#9333ea" />
             </View>
           </View>
        )}
      </ScrollView>

      {/* Chips */}
      <View style={styles.chipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {promptChips.map((chip, index) => (
            <TouchableOpacity key={index} style={styles.chip} onPress={() => handleSend(chip)}>
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask me anything..."
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
          onPress={() => handleSend()}
          disabled={!inputText.trim()}
        >
          <MaterialCommunityIcons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#7e22ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    marginRight: 16
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff' },
  headerSubtitle: { fontFamily: 'Outfit-Medium', color: 'rgba(255,255,255,0.8)', fontSize: 12,},
  
  chatContainer: { padding: 16, paddingBottom: 20 },
  
  bubbleWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  bubbleUserWrapper: { justifyContent: 'flex-end' },
  bubbleModelWrapper: { justifyContent: 'flex-start' },
  
  modelAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#9333ea',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, marginBottom: 4
  },
  
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  modelBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  bubbleText: { fontFamily: 'Outfit-Regular', fontSize: 15, lineHeight: 22 },
  userText: { fontFamily: 'Outfit-Regular', color: '#fff' },
  modelText: { fontFamily: 'Outfit-Regular', color: '#1e293b' },
  
  chipsWrapper: { paddingVertical: 8, backgroundColor: '#f8fafc' },
  chipsScroll: { paddingHorizontal: 16 },
  chip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8
  },
  chipText: { fontFamily: 'Outfit-SemiBold', color: '#64748b', fontSize: 13,},
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#e2e8f0'
  },
  textInput: {
    fontFamily: 'Outfit-Regular',
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#0f172a',
    maxHeight: 100, minHeight: 40
  },
  sendBtn: {
    backgroundColor: '#9333ea',
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12
  }
});
