// Plan Editor Hook
// Manages edit mode, filters, and dirty state tracking

import { useState, useCallback } from 'react';

export const usePlanEditor = () => {
  const [editMode, setEditMode] = useState<boolean>(false);
  const [onlyValued, setOnlyValued] = useState<boolean>(true);
  const [onlyConsuntivo, setOnlyConsuntivo] = useState<boolean>(false);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  const enableEditMode = useCallback(() => {
    setEditMode(true);
  }, []);

  const disableEditMode = useCallback(() => {
    setEditMode(false);
  }, []);

  const clearDirtyKeys = useCallback(() => {
    setDirtyKeys(new Set());
  }, []);

  const addDirtyKey = useCallback((key: string) => {
    setDirtyKeys((prev) => new Set([...prev, key]));
  }, []);

  const removeDirtyKey = useCallback((key: string) => {
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const toggleOnlyValued = useCallback(() => {
    setOnlyValued((prev) => !prev);
  }, []);

  const toggleOnlyConsuntivo = useCallback(() => {
    setOnlyConsuntivo((prev) => !prev);
  }, []);

  return {
    // State
    editMode,
    onlyValued,
    onlyConsuntivo,
    dirtyKeys,
    
    // Actions
    enableEditMode,
    disableEditMode,
    clearDirtyKeys,
    addDirtyKey,
    removeDirtyKey,
    toggleOnlyValued,
    toggleOnlyConsuntivo,
  };
};
