import React from 'react';
import { View, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Send } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  t: (key: any) => string;
  colors: any;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  onSend,
  sending,
  t,
  colors,
}) => {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.inputArea, { backgroundColor: colors.header, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('write_message')}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Pressable
          onPress={onSend}
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          disabled={!inputText.trim() || sending}
        >
          <Send color="#fff" size={20} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});

export default ChatInput;
