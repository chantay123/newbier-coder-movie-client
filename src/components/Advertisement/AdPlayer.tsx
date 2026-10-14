/**
 * @file AdPlayer.tsx
 * @description Video-ad player with skip countdown and tracking.
 */

import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import { FaForward } from 'react-icons/fa';
import adService, { Advertisement } from '@/API/services/adService';
import styles from '../../styles/AdPlayer.module.css';
import { useAdContext } from '@/context/AdContext';

export interface AdPlayerProps {
  onAdComplete: () => void;
  allowSkip?: boolean;
  skipDelay?: number;
}

type AdServiceWithTracking = {
  getRandomVideoAd: () => Promise<Advertisement | null>;
  trackAdImpression: (id: string) => Promise<unknown>;
  trackAdSkip: (id: string) => Promise<unknown>;
  trackAdClick: (id: string) => Promise<unknown>;
};

const trackingService = adService as unknown as AdServiceWithTracking;

const AdPlayer: React.FC<AdPlayerProps> = ({
  onAdComplete,
  allowSkip = true,
  skipDelay = 5
}) => {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const [adTracked, setAdTracked] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipCountdownRef = useRef<number>(skipDelay);
  const { hideVideoAds, isLoading: isAdContextLoading } = useAdContext();

  useEffect(() => {
    if (hideVideoAds === true) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      onAdComplete();
    }
  }, [hideVideoAds, onAdComplete]);

  useEffect(() => {
    if (hideVideoAds === true) return;
    if (isAdContextLoading) return;

    const fetchAd = async (): Promise<void> => {
      try {
        setLoading(true);
        const adData: Advertisement | null = await trackingService.getRandomVideoAd();

        if (hideVideoAds) {
          onAdComplete();
          return;
        }

        if (adData) {
          setAd(adData);
          setTimeRemaining(adData.duration || 15);
        } else {
          onAdComplete();
        }
      } catch (error) {
        console.error('Error fetching video ad:', error);
        onAdComplete();
      } finally {
        setLoading(false);
      }
    };

    fetchAd();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [hideVideoAds, isAdContextLoading, onAdComplete]);

  useEffect(() => {
    const trackImpression = async (): Promise<void> => {
      if (ad && !adTracked) {
        try {
          await trackingService.trackAdImpression(ad._id);
          setAdTracked(true);
        } catch (error) {
          console.error('Error tracking ad impression:', error);
        }
      }
    };
    trackImpression();
  }, [ad, adTracked]);

  useEffect(() => {
    if (!ad || !videoRef.current) return;

    const videoElement = videoRef.current;

    const handleCanPlay = (): void => {
      videoElement.play().catch((err) => {
        console.error('Error playing video ad:', err);
        onAdComplete();
      });
    };

    const handleEnded = (): void => {
      onAdComplete();
    };

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });

      if (allowSkip && skipCountdownRef.current > 0) {
        skipCountdownRef.current -= 1;
        if (skipCountdownRef.current === 0) {
          setCanSkip(true);
        }
      }
    }, 1000);

    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('ended', handleEnded);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [ad, onAdComplete, allowSkip, skipDelay]);

  const handleSkip = async (): Promise<void> => {
    if (!canSkip || !ad) return;

    try {
      await trackingService.trackAdSkip(ad._id);
    } catch (error) {
      console.error('Error tracking ad skip:', error);
    }
    onAdComplete();
  };

  const handleAdClick = async (): Promise<void> => {
    if (!ad) return;

    try {
      await trackingService.trackAdClick(ad._id);
      window.open(ad.link, '_blank');
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } catch (error) {
      console.error('Error tracking ad click:', error);
      window.open(ad.link, '_blank');
    }
  };

  if (!ad) return null;

  return (
    <div className={styles.adPlayerContainer}>
      <div className={styles.videoWrapper}>
        <div
          className={styles.adClickArea}
          onClick={handleAdClick}
          role="button"
          tabIndex={0}
        >
          <video
            ref={videoRef}
            className={styles.adVideo}
            src={ad.content}
            muted={false}
            playsInline
            preload="auto"
            aria-label={`Advertisement from ${ad.advertiser}`}
          />
        </div>

        <div className={styles.adOverlay}>
          <div className={styles.adInfo}>
            <span className={styles.adLabel}>Quảng cáo</span>
          </div>
          <div className={styles.adDetails}>
            <p className={styles.adTitle}>{ad.name}</p>
            <p className={styles.adAdvertiser}>{ad.advertiser}</p>
          </div>

          {allowSkip && (
            <button
              className={`${styles.skipButton} ${canSkip ? styles.canSkip : ''}`}
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                handleSkip();
              }}
              disabled={!canSkip}
              type="button"
              aria-label="Skip advertisement"
            >
              <FaForward className={styles.skipIcon} />
              <span>{canSkip ? 'Bỏ qua' : `Bỏ qua sau ${skipCountdownRef.current}s`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdPlayer;
