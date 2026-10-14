import React from 'react';

interface ShareableMovie {
  url?: string;
}

export interface ShareButtonProps {
  movie?: ShareableMovie | null;
}

const ShareButton: React.FC<ShareButtonProps> = ({ movie }) => {
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(movie?.url || '')}`;

  return (
    <a href={shareUrl} target="_blank" rel="noopener noreferrer">
      Chia sẻ trên Facebook
    </a>
  );
};

export default ShareButton;
