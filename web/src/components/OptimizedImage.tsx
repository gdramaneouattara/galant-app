import React from 'react';

type OptimizedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  eager?: boolean;
};

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  eager = false,
  loading,
  decoding,
  draggable,
  ...props
}) => (
  <img
    {...props}
    loading={loading || (eager ? 'eager' : 'lazy')}
    decoding={decoding || 'async'}
    draggable={draggable ?? false}
  />
);

export default OptimizedImage;
