/**
 * @file actorAvatarGenerator.ts
 * @description Generates stylized vector avatar Data URIs using @dicebear/core and @dicebear/collection.
 * Dynamically customizes hairstyles and traits based on the actor's gender.
 */

import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';

export const HAIR_BY_GENDER = {
  female: ['long01', 'long02', 'long03', 'long04', 'long05'] as const,
  male: ['short01', 'short02', 'short03', 'short04', 'short05'] as const,
};

/**
 * Generates an SVG Data URI avatar based on a unique seed and actor gender.
 * If gender is female -> uses long hairstyles.
 * If gender is male -> uses short hairstyles.
 * If gender is other or omitted -> fully randomized hair.
 *
 * @param seed Unique seed string (e.g. actor name, slug, or random token)
 * @param gender Actor's gender ('male' | 'female' | 'other')
 * @returns SVG Data URI (data:image/svg+xml;utf8,...)
 */
export function generateActorAvatar(
  seed: string,
  gender?: 'male' | 'female' | 'other'
): string {
  const safeSeed = seed && seed.trim() ? seed.trim() : `actor-${Date.now()}`;

  const hairOptions =
    gender === 'female'
      ? [...HAIR_BY_GENDER.female]
      : gender === 'male'
      ? [...HAIR_BY_GENDER.male]
      : undefined;

  const avatar = createAvatar(adventurer, {
    seed: safeSeed,
    ...(hairOptions ? { hair: hairOptions as unknown as any } : {}),
  });

  return avatar.toDataUri();
}
