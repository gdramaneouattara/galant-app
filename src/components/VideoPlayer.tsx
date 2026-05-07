import React, { useRef, useState } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { Play } from 'lucide-react-native';

interface VideoPlayerProps {
  uri: string;
  style?: any;
  useNativeControls?: boolean;
  isLooping?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri, style, useNativeControls = true, isLooping = true }) => {
  const video = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus>({} as AVPlaybackStatus);
  const [loading, setLoading] = useState(true);

  const isPlaying = (s: AVPlaybackStatus): boolean => {
    return s.isLoaded && (s as AVPlaybackStatusSuccess).isPlaying;
  };

  return (
    <View style={[styles.container, style]}>
      <Video
        ref={video}
        style={styles.video}
        source={{ uri }}
        useNativeControls={useNativeControls}
        resizeMode={ResizeMode.COVER}
        isLooping={isLooping}
        onPlaybackStatusUpdate={(s: AVPlaybackStatus) => {
          setStatus(s);
          if (s.isLoaded) setLoading(false);
        }}
        onLoadStart={() => setLoading(true)}
      />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}
      {!useNativeControls && status.isLoaded && !isPlaying(status) && (
        <Pressable
          style={styles.controls}
          onPress={() => video.current?.playAsync()}
        >
          <Play color="#fff" size={48} fill="#fff" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  video: { alignSelf: 'stretch', width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  controls: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }
});

export default VideoPlayer;
