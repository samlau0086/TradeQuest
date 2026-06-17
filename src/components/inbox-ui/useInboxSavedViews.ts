import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  inboxSavedViewMatches,
  readInboxSavedViews,
  writeInboxSavedViews,
} from './inboxModel';
import type {
  InboxChannelFilter,
  InboxQueueDensity,
  InboxQueueOwnerFilter,
  InboxQueueSortMode,
  InboxSavedView,
} from './inboxModel';

type QueueViewState = Pick<
  InboxSavedView,
  | 'filter'
  | 'channelFilter'
  | 'search'
  | 'searchTags'
  | 'followUpOnly'
  | 'queueSortMode'
  | 'queueOwnerFilter'
  | 'queueDensity'
>;

interface UseInboxSavedViewsParams {
  defaultQueueView: QueueViewState;
  currentQueueView: QueueViewState;
  setFilter: (value: InboxSavedView['filter']) => void;
  setChannelFilter: (value: InboxChannelFilter) => void;
  setSearch: (value: string) => void;
  setSearchTags: (value: string[]) => void;
  setFollowUpOnly: (value: boolean) => void;
  setQueueSortMode: (value: InboxQueueSortMode) => void;
  setQueueOwnerFilter: (value: InboxQueueOwnerFilter) => void;
  setQueueDensity: (value: InboxQueueDensity) => void;
}

export function useInboxSavedViews({
  defaultQueueView,
  currentQueueView,
  setFilter,
  setChannelFilter,
  setSearch,
  setSearchTags,
  setFollowUpOnly,
  setQueueSortMode,
  setQueueOwnerFilter,
  setQueueDensity,
}: UseInboxSavedViewsParams) {
  const [savedViews, setSavedViews] = useState<InboxSavedView[]>(() => readInboxSavedViews());
  const [selectedSavedViewId, setSelectedSavedViewId] = useState<string | null>(null);
  const defaultViewAppliedRef = useRef(false);

  const applySavedView = useCallback((view: InboxSavedView) => {
    setSelectedSavedViewId(view.id);
    setFilter(view.filter);
    setChannelFilter(view.channelFilter);
    setSearch(view.search);
    setSearchTags(view.searchTags);
    setFollowUpOnly(view.followUpOnly);
    setQueueSortMode(view.queueSortMode);
    setQueueOwnerFilter(view.queueOwnerFilter);
    setQueueDensity(view.queueDensity);
  }, [
    setChannelFilter,
    setFilter,
    setFollowUpOnly,
    setQueueDensity,
    setQueueOwnerFilter,
    setQueueSortMode,
    setSearch,
    setSearchTags,
  ]);

  const matchedSavedViewId = useMemo(
    () => savedViews.find(view => inboxSavedViewMatches(view, currentQueueView))?.id ?? null,
    [currentQueueView, savedViews],
  );

  const activeSavedViewId = selectedSavedViewId || matchedSavedViewId;

  const activeSavedView = useMemo(
    () => savedViews.find(view => view.id === activeSavedViewId) ?? null,
    [activeSavedViewId, savedViews],
  );

  const currentQueueViewDirty = useMemo(
    () => activeSavedView
      ? !inboxSavedViewMatches(activeSavedView, currentQueueView)
      : !inboxSavedViewMatches(defaultQueueView, currentQueueView),
    [activeSavedView, currentQueueView, defaultQueueView],
  );

  useEffect(() => {
    writeInboxSavedViews(savedViews);
  }, [savedViews]);

  useEffect(() => {
    if (defaultViewAppliedRef.current) return;
    defaultViewAppliedRef.current = true;
    const defaultView = savedViews.find(view => view.isDefault);
    if (!defaultView) return;
    if (!inboxSavedViewMatches(defaultQueueView, currentQueueView)) return;
    applySavedView(defaultView);
  }, [applySavedView, currentQueueView, defaultQueueView, savedViews]);

  const saveCurrentQueueView = useCallback((name?: string) => {
    const trimmedName = (name || '').trim();
    const now = new Date().toISOString();
    const activeView = activeSavedViewId ? savedViews.find(item => item.id === activeSavedViewId) : null;
    const normalizedName = trimmedName || activeView?.name || `View ${savedViews.length + 1}`;
    const existingByName = savedViews.find(item => item.name.toLowerCase() === normalizedName.toLowerCase());
    const targetId = activeView?.id || existingByName?.id || `saved_view_${Date.now()}`;
    const nextView: InboxSavedView = {
      id: targetId,
      name: normalizedName,
      ...currentQueueView,
      isDefault: existingByName?.isDefault || activeView?.isDefault || false,
      createdAt: existingByName?.createdAt || activeView?.createdAt || now,
      updatedAt: now,
    };
    const withoutTarget = savedViews.filter(item => item.id !== targetId);
    setSelectedSavedViewId(targetId);
    setSavedViews(
      [nextView, ...withoutTarget].sort((left, right) => (
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )),
    );
  }, [activeSavedViewId, currentQueueView, savedViews]);

  const deleteSavedQueueView = useCallback((viewId: string) => {
    setSelectedSavedViewId(previous => (previous === viewId ? null : previous));
    setSavedViews(previous => previous.filter(item => item.id !== viewId));
  }, []);

  const setDefaultSavedQueueView = useCallback((viewId: string) => {
    setSavedViews(previous => previous.map(item => ({
      ...item,
      isDefault: item.id === viewId,
      updatedAt: item.id === viewId ? new Date().toISOString() : item.updatedAt,
    })));
  }, []);

  const resetQueueView = useCallback(() => {
    setSelectedSavedViewId(null);
    setFilter(defaultQueueView.filter);
    setChannelFilter(defaultQueueView.channelFilter);
    setSearch(defaultQueueView.search);
    setSearchTags(defaultQueueView.searchTags);
    setFollowUpOnly(defaultQueueView.followUpOnly);
    setQueueSortMode(defaultQueueView.queueSortMode);
    setQueueOwnerFilter(defaultQueueView.queueOwnerFilter);
    setQueueDensity(defaultQueueView.queueDensity);
  }, [
    defaultQueueView,
    setChannelFilter,
    setFilter,
    setFollowUpOnly,
    setQueueDensity,
    setQueueOwnerFilter,
    setQueueSortMode,
    setSearch,
    setSearchTags,
  ]);

  return {
    savedViews,
    activeSavedViewId,
    currentQueueViewDirty,
    applySavedView,
    saveCurrentQueueView,
    deleteSavedQueueView,
    setDefaultSavedQueueView,
    resetQueueView,
  };
}
