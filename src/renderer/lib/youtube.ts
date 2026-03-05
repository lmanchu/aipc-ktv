// AIPC KTV - Video Search Client (Invidious API, no API key required)

import type { Song } from '../types'

export interface YouTubeSearchOptions {
  query: string
  maxResults?: number
}

export interface YouTubeVideoDetails {
  videoId: string
  title: string
  channelTitle: string
  description: string
  publishedAt: string
  thumbnail: {
    url: string
    width: number
    height: number
  }
  duration: number // seconds
  viewCount: number
  likeCount: number
}

export interface YouTubeSearchResult {
  videos: YouTubeVideoDetails[]
  nextPageToken?: string
  totalResults?: number
}

export interface YouTubeError {
  code: number
  message: string
  reason?: string
}

// Public Invidious instances (fallback chain)
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
  'https://vid.puffyan.us',
]

/**
 * Video Search Client using Invidious API (no API key required)
 * Playback still uses YouTube IFrame Player API (official, compliant)
 */
export class YouTubeClient {
  private instances: string[]
  private currentIndex: number = 0

  constructor(_apiKey?: string) {
    // apiKey parameter kept for backward compatibility but not used
    this.instances = [...INVIDIOUS_INSTANCES]
  }

  private get baseUrl(): string {
    return this.instances[this.currentIndex]
  }

  private rotateInstance(): void {
    this.currentIndex = (this.currentIndex + 1) % this.instances.length
  }

  /**
   * Make request with instance fallback
   */
  private async request<T>(path: string): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.instances.length; attempt++) {
      const url = `${this.baseUrl}/api/v1${path}`
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          throw new YouTubeAPIError({
            code: response.status,
            message: `${response.statusText} from ${this.baseUrl}`,
          })
        }

        return (await response.json()) as T
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.warn(`[Search] ${this.baseUrl} failed: ${lastError.message}, trying next...`)
        this.rotateInstance()
      }
    }

    throw new YouTubeAPIError({
      code: 0,
      message: `All Invidious instances failed. Last error: ${lastError?.message}`,
    })
  }

  /**
   * Search for videos
   */
  async searchVideos(options: YouTubeSearchOptions): Promise<YouTubeSearchResult> {
    const { query, maxResults = 10 } = options

    if (!query?.trim()) {
      throw new YouTubeAPIError({ code: 400, message: 'Search query is required', reason: 'INVALID_QUERY' })
    }

    const encoded = encodeURIComponent(query.trim())
    const results = await this.request<InvidiousSearchItem[]>(
      `/search?q=${encoded}&type=video&sort_by=relevance`
    )

    const videos: YouTubeVideoDetails[] = results
      .filter((item) => item.type === 'video')
      .slice(0, maxResults)
      .map((item) => ({
        videoId: item.videoId,
        title: item.title,
        channelTitle: item.author,
        description: item.description || '',
        publishedAt: new Date((item.published || 0) * 1000).toISOString(),
        thumbnail: {
          url: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
          width: item.videoThumbnails?.[0]?.width || 480,
          height: item.videoThumbnails?.[0]?.height || 360,
        },
        duration: item.lengthSeconds || 0,
        viewCount: item.viewCount || 0,
        likeCount: 0,
      }))

    return { videos, totalResults: videos.length }
  }

  /**
   * Get video details
   */
  async getVideoDetails(videoId: string): Promise<YouTubeVideoDetails> {
    if (!videoId?.trim()) {
      throw new YouTubeAPIError({ code: 400, message: 'Video ID is required', reason: 'INVALID_VIDEO_ID' })
    }

    const item = await this.request<InvidiousVideoItem>(`/videos/${videoId}`)

    return {
      videoId: item.videoId,
      title: item.title,
      channelTitle: item.author,
      description: item.description || '',
      publishedAt: new Date((item.published || 0) * 1000).toISOString(),
      thumbnail: {
        url: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        width: item.videoThumbnails?.[0]?.width || 480,
        height: item.videoThumbnails?.[0]?.height || 360,
      },
      duration: item.lengthSeconds || 0,
      viewCount: item.viewCount || 0,
      likeCount: item.likeCount || 0,
    }
  }

  /**
   * Search with full details (for Invidious, search already returns details)
   */
  async searchVideosWithDetails(options: YouTubeSearchOptions): Promise<YouTubeSearchResult> {
    return this.searchVideos(options)
  }

  /**
   * Get captions/subtitles for a video
   */
  async getCaptions(videoId: string): Promise<CaptionTrack[]> {
    try {
      const video = await this.request<InvidiousVideoItem>(`/videos/${videoId}`)
      return (video.captions || []).map((c) => ({
        label: c.label,
        languageCode: c.language_code,
        url: `${this.baseUrl}${c.url}`,
      }))
    } catch {
      return []
    }
  }

  /**
   * Convert YouTubeVideoDetails to Song
   */
  static videoDetailsToSong(details: YouTubeVideoDetails): Song {
    return {
      videoId: details.videoId,
      title: details.title,
      channel: details.channelTitle,
      thumbnail: details.thumbnail.url,
      duration: details.duration,
    }
  }

  static getQuotaStatus() {
    return { minuteUsed: 0, minuteLimit: 0, dayUsed: 0, dayLimit: 0 }
  }
}

// Invidious API response types
interface InvidiousSearchItem {
  type: string
  videoId: string
  title: string
  author: string
  description?: string
  published?: number
  lengthSeconds?: number
  viewCount?: number
  videoThumbnails?: Array<{ url: string; width: number; height: number }>
}

interface InvidiousVideoItem {
  videoId: string
  title: string
  author: string
  description?: string
  published?: number
  lengthSeconds?: number
  viewCount?: number
  likeCount?: number
  videoThumbnails?: Array<{ url: string; width: number; height: number }>
  captions?: Array<{ label: string; language_code: string; url: string }>
}

export interface CaptionTrack {
  label: string
  languageCode: string
  url: string
}

export class YouTubeAPIError extends Error {
  public readonly code: number
  public readonly reason?: string

  constructor(error: YouTubeError) {
    super(error.message)
    this.name = 'YouTubeAPIError'
    this.code = error.code
    this.reason = error.reason
  }

  isQuotaExceeded(): boolean { return false }
  isInvalidKey(): boolean { return false }
  isRateLimited(): boolean { return this.code === 429 }
}

let defaultClient: YouTubeClient | null = null

export function getYouTubeClient(apiKey?: string): YouTubeClient {
  if (!defaultClient) defaultClient = new YouTubeClient(apiKey)
  return defaultClient
}

export function resetYouTubeClient(): void {
  defaultClient = null
}
