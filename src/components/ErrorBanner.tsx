import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ErrorBannerProps = {
  message: string;
  onDismiss: () => void;
};

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onDismiss} style={styles.button}>
        <Text style={styles.buttonText}>OK</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fee2e2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {
    color: '#991b1b',
    flex: 1,
    fontWeight: '600',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fecaca',
  },
  buttonText: {
    color: '#991b1b',
    fontWeight: '700',
  },
});

export default ErrorBanner;
