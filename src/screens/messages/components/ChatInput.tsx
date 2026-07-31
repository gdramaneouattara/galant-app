import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Send, Image as ImageIcon, Video, Mic, Square, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  onAttachMedia: (type: 'IMAGE' | 'VIDEO') => void;
  onToggleVoice: () => void;
  onCancelVoice: () => void;
  sending: boolean;
  uploading?: boolean;
  isRecording?: boolean;
  recordingDuration?: string;
  t: (key: any) => string;
  colors: any;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  onSend,
  onAttachMedia,
  onToggleVoice,
  onCancelVoice,
  sending,
  uploading,
  isRecording,
  recordingDuration,
  t,
  colors,
}) => {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.inputArea, { backgroundColor: colors.header, borderTopColor: colors.border }]}>
        {isRecording ? (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={[styles.recordingText, { color: colors.text }]}>
              {t('vocal_serenade')} {recordingDuration || '0:00'}
            </Text>
            <Pressable onPress={onCancelVoice} disabled={uploading} style={styles.iconBtn}>
              <Trash2 color={COLORS.muted} size={20} />
            </Pressable>
            <Pressable onPress={onToggleVoice} disabled={uploading} style={[styles.stopVoiceBtn, uploading && styles.sendBtnDisabled]}>
              {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Square color="#fff" fill="#fff" size={18} />}
            </Pressable>
          </View>
        ) : (
        <>
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
          <Pressable
            onPress={onToggleVoice}
            disabled={sending || uploading}
            style={styles.iconBtn}
          >
            <Mic color={uploading ? COLORS.muted : COLORS.primary} size={22} />
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
        </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, gap: 8 },
  attachActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  recordingBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordingDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ef4444' },
  recordingText: { flex: 1, fontSize: 13, fontWeight: '800' },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center' },
  stopVoiceBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});

export default ChatInput;
