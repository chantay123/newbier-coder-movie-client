/**
 * The helper that parses, classifies and groups the server and audio
 * stream tracks (Vietnamese subtitles, dubbing, original audio).
 *
 * It removes the duplicate buttons and enables the selection of several
 * sources on hover (Source 1, Source 2).
 */

export type TrackType = 'voice' | 'dub' | 'sub' | 'server';

export interface ParsedTrack {
  type: TrackType;
  title: string;
  badge: string;
  icon: string;
  displayName: string;
  rawName: string;
}

/** A raw server entry coming from the API. */
export interface ServerEntry {
  server_name?: string;
  server_data?: unknown[];
  [key: string]: unknown;
}

/** A source inside a group (Source 1, Source 2...). */
export interface GroupSource {
  originalIndex: number;
  serverName: string;
  sourceLabel: string;
  shortLabel: string;
  sourceNumber: number;
}

/** A group of sources that share the same audio type. */
export interface TrackGroup {
  key: string;
  label: string;
  icon: string;
  sources: GroupSource[];
}

/**
 * Parses the name of a server and detects its audio type.
 *
 * @param serverName - The raw name of the server, such as
 *                     "Vietsub #1".
 * @param index - The position of the server, used to build the fallback
 *                name.
 * @returns The parsed track with its type, title, badge and icon.
 */
export function parseServerTrack(serverName: string = '', index: number = 0): ParsedTrack {
  const raw = String(serverName || '').trim();
  const lower = raw.toLowerCase();

  let type: TrackType = 'server';
  let title = 'Bản Chuẩn';
  let icon = 'fas fa-play-circle';
  let badge = '';

  if (lower.includes('thuyết minh') || lower.includes('thuyet minh')) {
    type = 'voice';
    title = 'Thuyết Minh';
    icon = 'fas fa-microphone-alt';
    const match = raw.match(/#\s*(\d+)|\b(\d+)\b/);
    if (match) badge = `#${match[1] || match[2]}`;
  } else if (lower.includes('lồng tiếng') || lower.includes('long tieng')) {
    type = 'dub';
    title = 'Lồng Tiếng';
    icon = 'fas fa-headset';
    const match = raw.match(/#\s*(\d+)|\b(\d+)\b/);
    if (match) badge = `#${match[1] || match[2]}`;
  } else if (lower.includes('vietsub') || lower.includes('phụ đề') || lower.includes('sub')) {
    type = 'sub';
    title = 'Vietsub';
    icon = 'fas fa-closed-captioning';
    const match = raw.match(/#\s*(\d+)|\b(\d+)\b/);
    if (match) badge = `#${match[1] || match[2]}`;
  } else if (raw) {
    const match = raw.match(/#\s*(\d+)|\b(\d+)\b/);
    if (match) badge = `#${match[1] || match[2]}`;
    const cleaned = raw.replace(/#\s*\d+/g, '').trim();
    title = cleaned || `Server ${index + 1}`;
  } else {
    title = `Server ${index + 1}`;
  }

  return {
    type,
    title,
    badge,
    icon,
    displayName: badge ? `${title} ${badge}` : title,
    rawName: raw || `Server ${index + 1}`
  };
}

/**
 * Groups an array of raw servers by audio version (Vietnamese subtitles,
 * dubbing, original audio).
 *
 * Every group holds one or more sources (Source 1, Source 2), which
 * prevents duplicate buttons.
 *
 * @param servers - The raw servers of the movie.
 * @returns The groups of sources, one per audio type.
 */
export function groupServersByTrack(servers: ServerEntry[] = []): TrackGroup[] {
  if (!Array.isArray(servers) || servers.length === 0) return [];

  const groupMap = new Map<string, TrackGroup>();

  servers.forEach((srv, index) => {
    const raw = String(srv?.server_name || '').trim();
    const lower = raw.toLowerCase();

    let key = 'server';
    let label = 'Bản Chuẩn';
    let icon = 'fas fa-play-circle';

    if (lower.includes('thuyết minh') || lower.includes('thuyet minh')) {
      key = 'thuyet-minh';
      label = 'Thuyết Minh';
      icon = 'fas fa-microphone-alt';
    } else if (lower.includes('lồng tiếng') || lower.includes('long tieng')) {
      key = 'long-tieng';
      label = 'Lồng Tiếng';
      icon = 'fas fa-headset';
    } else if (lower.includes('vietsub') || lower.includes('phụ đề') || lower.includes('sub')) {
      key = 'vietsub';
      label = 'Vietsub';
      icon = 'fas fa-closed-captioning';
    } else if (raw) {
      const match = raw.match(/#\s*(\d+)|\b(\d+)\b/);
      if (match) {
        key = 'server-general';
        label = 'Nguồn Phát';
        icon = 'fas fa-server';
      } else {
        key = `custom-${raw.toLowerCase()}`;
        label = raw;
      }
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        label,
        icon,
        sources: []
      });
    }

    const group = groupMap.get(key)!;
    const sourceCount = group.sources.length + 1;
    const sourceLabel = sourceCount === 1 ? `Nguồn 1 (Chính)` : `Nguồn ${sourceCount} (Dự phòng)`;

    group.sources.push({
      originalIndex: index,
      serverName: raw || `Server ${index + 1}`,
      sourceLabel,
      shortLabel: `Nguồn ${sourceCount}`,
      sourceNumber: sourceCount
    });
  });

  return Array.from(groupMap.values());
}
