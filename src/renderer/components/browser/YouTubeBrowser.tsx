import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useQueueStore } from '../../store'
import type { Song } from '../../types'

// Click interceptor JS injected into YouTube webview
// Captures clicks on video links, extracts metadata, sends via console.log
const CLICK_INTERCEPTOR = `
(function() {
  if (window.__ktvInterceptorInstalled) return;
  window.__ktvInterceptorInstalled = true;

  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href*="/watch"], a[href*="youtu.be/"]');
    if (!link) return;

    var href = link.href || '';
    var videoId = null;
    try {
      var u = new URL(href);
      if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
        videoId = u.searchParams.get('v');
      } else if (u.hostname === 'youtu.be') {
        videoId = u.pathname.slice(1);
      }
    } catch(err) {}
    if (!videoId) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Extract metadata from search result context
    var container = link.closest('ytd-video-renderer, ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-reel-item-renderer');
    var title = '';
    var channel = '';
    if (container) {
      var titleEl = container.querySelector('#video-title');
      title = titleEl ? titleEl.textContent.trim() : '';
      var channelEl = container.querySelector('#channel-name, .ytd-channel-name');
      channel = channelEl ? channelEl.textContent.trim() : '';
    }
    if (!title) {
      title = link.getAttribute('title') || link.textContent.trim() || '';
    }

    console.log('__KTV_ADD__:' + JSON.stringify({ videoId: videoId, title: title, channel: channel }));
  }, true);
})();
`

export default function YouTubeBrowser() {
  const webviewRef = useRef<HTMLWebViewElement>(null)
  const { addSong } = useQueueStore()
  const [currentUrl, setCurrentUrl] = useState('https://www.youtube.com')
  const [addedId, setAddedId] = useState<string | null>(null)

  const extractVideoId = (url: string): string | null => {
    try {
      const u = new URL(url)
      if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
        return u.searchParams.get('v')
      }
      if (u.hostname === 'youtu.be') {
        return u.pathname.slice(1)
      }
    } catch {}
    return null
  }

  // Inject click interceptor after page loads
  const injectInterceptor = useCallback(() => {
    const webview = webviewRef.current as any
    if (!webview?.executeJavaScript) return
    webview.executeJavaScript(CLICK_INTERCEPTOR).catch(() => {})
  }, [])

  // Listen for intercepted video clicks via console messages
  useEffect(() => {
    const webview = webviewRef.current as any
    if (!webview) return

    const onConsoleMessage = (e: any) => {
      const msg: string = e.message || ''
      if (!msg.startsWith('__KTV_ADD__:')) return
      try {
        const data = JSON.parse(msg.slice('__KTV_ADD__:'.length))
        if (!data.videoId) return

        addSong({
          videoId: data.videoId,
          title: data.title || 'YouTube Video',
          channel: data.channel || '',
          thumbnail: 'https://i.ytimg.com/vi/' + data.videoId + '/hqdefault.jpg',
          duration: 0,
        })

        setAddedId(data.videoId)
        setTimeout(() => setAddedId(null), 1500)
      } catch {}
    }

    const onDidFinishLoad = () => injectInterceptor()
    const onDidNavigateInPage = () => injectInterceptor()

    webview.addEventListener('console-message', onConsoleMessage)
    webview.addEventListener('did-finish-load', onDidFinishLoad)
    webview.addEventListener('did-navigate-in-page', onDidNavigateInPage)

    return () => {
      webview.removeEventListener('console-message', onConsoleMessage)
      webview.removeEventListener('did-finish-load', onDidFinishLoad)
      webview.removeEventListener('did-navigate-in-page', onDidNavigateInPage)
    }
  }, [addSong, injectInterceptor])

  // Poll webview URL for display
  useEffect(() => {
    const poll = setInterval(() => {
      const webview = webviewRef.current as any
      if (!webview?.getURL) return
      try {
        const url = webview.getURL()
        if (url && url !== currentUrl) setCurrentUrl(url)
      } catch {}
    }, 500)
    return () => clearInterval(poll)
  }, [currentUrl])

  // If user somehow navigates to a /watch page directly, provide manual add button
  const currentVideoId = extractVideoId(currentUrl)

  const handleManualAdd = useCallback(async () => {
    if (!currentVideoId || !webviewRef.current) return
    try {
      const info = await (webviewRef.current as any).executeJavaScript(`
        (function() {
          var title = document.title.replace(' - YouTube', '').trim();
          var channelEl = document.querySelector('#channel-name a') || document.querySelector('ytd-channel-name a');
          var channel = channelEl ? channelEl.textContent.trim() : '';
          var vid = document.querySelector('video');
          var duration = vid ? Math.round(vid.duration || 0) : 0;
          return { title: title, channel: channel, duration: duration };
        })();
      `)
      addSong({
        videoId: currentVideoId,
        title: info?.title || 'YouTube Video',
        channel: info?.channel || '',
        thumbnail: 'https://i.ytimg.com/vi/' + currentVideoId + '/hqdefault.jpg',
        duration: info?.duration || 0,
      })
    } catch {
      addSong({
        videoId: currentVideoId,
        title: 'YouTube Video',
        channel: '',
        thumbnail: 'https://i.ytimg.com/vi/' + currentVideoId + '/hqdefault.jpg',
        duration: 0,
      })
    }
    setAddedId(currentVideoId)
    setTimeout(() => setAddedId(null), 1500)
  }, [currentVideoId, addSong])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => (webviewRef.current as any)?.goBack()}
          className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">Back</button>
        <button onClick={() => (webviewRef.current as any)?.goForward()}
          className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">Fwd</button>
        <button onClick={() => (webviewRef.current as any)?.reload()}
          className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">Reload</button>

        <div className="flex-1 px-3 py-1 bg-gray-100 rounded text-sm text-gray-600 truncate">
          {currentUrl}
        </div>

        {addedId && (
          <span className="px-3 py-1.5 text-sm font-bold bg-blue-500 text-white rounded-lg whitespace-nowrap">
            Added!
          </span>
        )}

        {currentVideoId && !addedId && (
          <button
            onClick={handleManualAdd}
            className="px-4 py-1.5 text-sm font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg whitespace-nowrap"
          >
            + Queue
          </button>
        )}

        {!currentVideoId && !addedId && (
          <span className="text-xs text-gray-400 whitespace-nowrap">Click any video to add</span>
        )}
      </div>

      <webview
        ref={webviewRef as any}
        src="https://www.youtube.com"
        style={{ width: '100%', flex: 1, border: 'none', borderRadius: '8px' }}
        {...{ allowpopups: 'true' } as any}
      />
    </div>
  )
}
