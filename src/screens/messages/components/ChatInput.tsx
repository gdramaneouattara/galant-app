import React from 'react';
import { View, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Send, Image as ImageIcon, Video, Paperclip } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  onAttachMedia: (type: 'IMAGE' | 'VIDEO') => void;
  sending: boolean;
  uploading?: boolean;
  t: (key: any) => string;
  colors: any;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  onSend,
  onAttachMedia,
  sending,
  uploading,
  t,
  colors,
}) => {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.inputArea, { backgroundColor: colors.header, borderTopColor: colors.border }]}>
        <View style={styles.attachActions}>
          <Pressable
            onPress={() => onAttachMedia('IMAGE')}
            disabled={sending || uploading}
            style={styles.iconBtn}
          >
            <ImageIcon color={uploading ? COLORS.muted : COLORS.primary} size={22} />
          </Pressable>
          <Pressable
            onPress={() => onAttachMedia('VIDEO')}
            disabled={sending || uploading}
            style={styles.iconBtn}
          >
            <Video color={uploading ? COLORS.muted : COLORS.primary} size={22} />
          </Pressable>
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('write_message')}
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!uploading}
        />

        <Pressable
          onPress={onSend}
          style={[styles.sendBtn, (!inputText.trim() || sending || uploading) && styles.sendBtnDisabled]}
          disabled={!inputText.trim() || sending || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Send color="#fff" size={20} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, gap: 8 },
  attachActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});

export default ChatInput;
