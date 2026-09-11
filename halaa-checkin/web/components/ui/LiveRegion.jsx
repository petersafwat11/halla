'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

const LiveRegionContext = createContext({
  announce: () => {},
});

/**
 * LiveRegion provider and announcer for screen reader notifications.
 * Preserves persistent error context while announcing state changes.
 */
export function LiveRegionProvider({ children }) {
  const [announcement, setAnnouncement] = useState({ message: '', politeness: 'polite' });

  const announce = useCallback((message, politeness = 'polite') => {
    setAnnouncement({ message, politeness });
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div
        role={announcement.politeness === 'assertive' ? 'alert' : 'status'}
        aria-live={announcement.politeness}
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          margin: '-1px',
          padding: 0,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          border: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {announcement.message}
      </div>
    </LiveRegionContext.Provider>
  );
}

export function useLiveRegion() {
  return useContext(LiveRegionContext);
}
