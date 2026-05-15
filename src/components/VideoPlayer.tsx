import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface VideoPlayerProps {
  uri: string;
  style?: any;
  useNativeControls?: boolean;
  isLooping?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri, style, useNativeControls = true, isLooping = true }) => {
  const player = useVideoPlayer(uri);

  useEffect(() => {
    player.loop = isLooping;
  }, [player, isLooping]);

  return (
    <View style={[styles.container, style]}>
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={useNativeControls}
        contentFit="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  video: { alignSelf: 'stretch', width: '100%', height: '100%' },
});

export default VideoPlayer;
