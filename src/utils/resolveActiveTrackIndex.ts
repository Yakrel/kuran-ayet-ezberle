type TrackLike = {
  id: string;
};

export type ActiveTrackChangedPayload = {
  index?: number;
  track?: {
    id?: string;
  } | null;
};

export function resolveTrackIndexFromTrackId(
  trackId: string | undefined,
  tracks: TrackLike[]
): number | null {
  if (!trackId) {
    return null;
  }

  const resolvedIndex = tracks.findIndex((track) => track.id === trackId);
  return resolvedIndex >= 0 ? resolvedIndex : null;
}

export function resolveActiveTrackIndex(
  payload: ActiveTrackChangedPayload,
  tracks: TrackLike[]
): number | null {
  if (typeof payload.index === 'number' && payload.index >= 0) {
    return payload.index;
  }

  return resolveTrackIndexFromTrackId(payload.track?.id, tracks);
}
