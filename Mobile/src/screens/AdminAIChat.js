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
  StatusBar,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';

const { width } = Dimensions.get('window');

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
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={['#F3F7FD', '#E5EDF9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#35A7C4" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="robot-outline" size={26} color="#35A7C4" style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <Text style={styles.headerSubtitle}>Powered by Gemini</Text>
            </View>
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.bubbleWrapper, msg.role === 'user' ? styles.bubbleUserWrapper : styles.bubbleModelWrapper]}>
              {msg.role === 'model' && (
                <View style={styles.modelAvatar}>
                  <MaterialCommunityIcons name="robot-outline" size={16} color="#35A7C4" />
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
                <MaterialCommunityIcons name="robot-outline" size={16} color="#35A7C4" />
              </View>
              <View style={[styles.bubble, styles.modelBubble, { paddingVertical: 12 }]}>
                <ActivityIndicator size="small" color="#35A7C4" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Chips */}
        <View style={styles.chipsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {promptChips.map((chip, index) => (
              <TouchableOpacity key={index} style={styles.chip} onPress={() => handleSend(chip)} activeOpacity={0.7}>
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Area */}
        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask me anything..."
              placeholderTextColor="#7C8BA1"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>
          <View style={[styles.sendBtnShadow, !inputText.trim() && { opacity: 0.5 }]}>
            <TouchableOpacity 
              style={styles.sendBtn} 
              onPress={() => handleSend()}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF0F3',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 3,
    marginRight: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#2C3A4E',
  },
  headerSubtitle: {
    fontFamily: 'Outfit-Medium',
    color: '#7C8BA1',
    fontSize: 12,
    marginTop: 2,
  },
  
  chatContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  bubbleUserWrapper: {
    justifyContent: 'flex-end',
  },
  bubbleModelWrapper: {
    justifyContent: 'flex-start',
  },
  
  modelAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#35A7C4', // Cyan active user bubble
    borderBottomRightRadius: 4,
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  modelBubble: {
    backgroundColor: '#ECF0F3',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    fontFamily: 'Outfit-Medium',
    color: '#fff',
  },
  modelText: {
    fontFamily: 'Outfit-Regular',
    color: '#2C3A4E',
  },
  
  chipsWrapper: {
    paddingVertical: 12,
  },
  chipsScroll: {
    paddingHorizontal: 16,
  },
  chip: {
    backgroundColor: '#ECF0F3',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 1,
  },
  chipText: {
    fontFamily: 'Outfit-SemiBold',
    color: '#35A7C4',
    fontSize: 13,
  },
  
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#ECF0F3',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
  },
  inputContainer: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 23,
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  textInput: {
    fontFamily: 'Outfit-Medium',
    flex: 1,
    fontSize: 15,
    color: '#2C3A4E',
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendBtnShadow: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginLeft: 12,
    backgroundColor: '#ECF0F3',
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  sendBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    backgroundColor: '#35A7C4',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
