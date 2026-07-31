import React from 'react';
import { Image, ImageProps } from 'react-native';

type OptimizedImageProps = ImageProps & {
  uri?: string | null;
};

const OptimizedImage: React.FC<OptimizedImageProps> = ({ uri, source, resizeMode = 'cover', ...props }) => {
  const resolvedSource = uri ? { uri, cache: 'force-cache' as const } : source;

  return (
    <Image
      {...props}
      source={resolvedSource}
      resizeMode={resizeMode}
      resizeMethod="resize"
      progressiveRenderingEnabled
    />
  );
};

export default OptimizedImage;
