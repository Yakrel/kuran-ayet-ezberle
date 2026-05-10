export function getAutoScrollTargetIndex(activeIndex: number, visibleIndexes: number[]) {
  const sortedVisibleIndexes = visibleIndexes
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);

  if (sortedVisibleIndexes.length === 0) {
    return activeIndex;
  }

  const firstVisibleIndex = sortedVisibleIndexes[0];
  const lastVisibleIndex = sortedVisibleIndexes[sortedVisibleIndexes.length - 1];
  const bandStart = sortedVisibleIndexes.length > 2 ? firstVisibleIndex + 1 : firstVisibleIndex;
  const bandEnd = sortedVisibleIndexes.length > 2 ? lastVisibleIndex - 1 : lastVisibleIndex;

  if (activeIndex < bandStart || activeIndex > bandEnd) {
    return activeIndex;
  }

  return null;
}

export function getBoundedScrollIndex(index: number, itemCount: number) {
  if (!Number.isInteger(index) || !Number.isInteger(itemCount) || itemCount <= 0) {
    return null;
  }

  return Math.max(0, Math.min(index, itemCount - 1));
}
