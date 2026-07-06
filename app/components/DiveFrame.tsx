'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface DiveFrameProps {
  diveId: string;
  diveUrl?: string;
  title?: string;
  version?: number;
}

interface EmbedSessionResponse {
  session?: string;
  error?: string;
}

export default function DiveFrame({ diveId, diveUrl, title, version }: DiveFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [session, setSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    async function loadSession() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/dives/embed-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ diveId, version }),
        });

        const payload = (await response.json()) as EmbedSessionResponse;

        if (!response.ok || !payload.session) {
          throw new Error(payload.error || 'Unable to create MotherDuck embed session');
        }

        if (!disposed) {
          setSession(payload.session);
        }
      } catch (loadError) {
        if (!disposed) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load Dive preview');
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      disposed = true;
    };
  }, [diveId, version]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !session) {
      return;
    }

    const embedOrigin = new URL(iframe.src).origin;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== embedOrigin || event.source !== iframe.contentWindow) {
        return;
      }

      const message = event.data;
      if (message?.type !== 'navigation-request' || typeof message.url !== 'string') {
        return;
      }

      let navigationUrl: URL;
      try {
        navigationUrl = new URL(message.url);
      } catch {
        return;
      }

      if (!['https:', 'http:'].includes(navigationUrl.protocol)) {
        return;
      }

      window.open(navigationUrl.toString(), '_blank', 'noopener,noreferrer');
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [session]);

  const iframeSrc = useMemo(() => {
    if (!session) {
      return '';
    }

    return `https://embed-motherduck.com/sandbox/#session=${encodeURIComponent(session)}`;
  }, [session]);

  return (
    <section className="dive-frame">
      <div className="dive-frame-header">
        <div>
          <div className="dive-frame-eyebrow">MotherDuck Dive</div>
          <h3>{title || 'Live Dive preview'}</h3>
        </div>
        {diveUrl ? (
          <a className="dive-frame-link" href={diveUrl} rel="noreferrer" target="_blank">
            Open in MotherDuck
          </a>
        ) : null}
      </div>

      {loading ? <div className="dive-frame-state">Preparing live Dive session…</div> : null}
      {error ? <div className="dive-frame-state error">{error}</div> : null}

      {session && !error ? (
        <iframe
          ref={iframeRef}
          className="dive-frame-iframe"
          sandbox="allow-scripts allow-same-origin"
          src={iframeSrc}
          title={title || 'MotherDuck Dive'}
        />
      ) : null}
    </section>
  );
}
