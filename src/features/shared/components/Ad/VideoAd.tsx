/**
 * @file VideoAd.tsx
 * @description Thin wrapper around AdPlayer for backwards-compatible import surface.
 */
import AdPlayer from './AdPlayer';

export interface VideoAdProps {
  onComplete?: () => void;
  allowSkip?: boolean;
  skipDelay?: number;
}

const VideoAd: React.FC<VideoAdProps> = ({
  onComplete = () => {},
  allowSkip = true,
  skipDelay = 5
}) => {
  return <AdPlayer onAdComplete={onComplete} allowSkip={allowSkip} skipDelay={skipDelay} />;
};

export default VideoAd;
