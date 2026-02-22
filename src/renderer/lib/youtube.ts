// AIPC KTV - YouTube Data API v3 Client

/**
 * YouTube Data API v3 client for searching videos and retrieving metadata
 * Handles rate limiting, quota management, and error cases
 */

import type { Song } from '../types';

export interface YouTubeSearchOptions {
  query: string;
  maxResults?: number;
}

export interface YouTubeVideoDetails {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  duration: number; // seconds
  viewCount: number;
  likeCount: number;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideoDetails[];
  nextPageToken?: string;
  totalResults?: number;
}

export interface YouTubeError {
  code: number;
  message: string;
  reason?: string;
}

// Rate limiting configuration
const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 100,
  REQUESTS_PER_DAY: 10000,
  MIN_REQUEST_INTERVAL: 600, // ms between requests
};

// Quota tracking
class QuotaManager {
  private requestsThisMinute: number = 0;
  private requestsToday: number = 0;
  private lastRequestTime: number = 0;
  private minuteStartTime: number = Date.now();
  private dayStartTime: number = Date.now();

  private resetIfNecessary(): void {
    const now = Date.now();

    // Reset minute counter every 60 seconds
    if (now - this.minuteStartTime >= 60000) {
      this.requestsThisMinute = 0;
      this.minuteStartTime = now;
    }

    // Reset day counter every 24 hours
    if (now - this.dayStartTime >= 86400000) {
      this.requestsToday = 0;
      this.dayStartTime = now;
    }
  }

  async waitForAvailability(): Promise<void> {
    this.resetIfNecessary();

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const timeUntilNextRequest = Math.max(0, RATE_LIMIT.MIN_REQUEST_INTERVAL - timeSinceLastRequest);

    if (timeUntilNextRequest > 0) {
      await new Promise(resolve => setTimeout(resolve, timeUntilNextRequest));
    }

    if (this.requestsThisMinute >= RATE_LIMIT.REQUESTS_PER_MINUTE) {
      const timeUntilNextMinute = 60000 - (now - this.minuteStartTime);
      throw new Error(
        `Rate limit exceeded: ${RATE_LIMIT.REQUESTS_PER_MINUTE} requests per minute. Please wait ${Math.ceil(timeUntilNextMinute / 1000)} seconds.`
      );
    }

    if (this.requestsToday >= RATE_LIMIT.REQUESTS_PER_DAY) {
      throw new Error(
        `Daily quota exceeded: ${RATE_LIMIT.REQUESTS_PER_DAY} requests per day. Please try again tomorrow.`
      );
    }
  }

  recordRequest(): void {
    this.requestsThisMinute++;
    this.requestsToday++;
    this.lastRequestTime = Date.now();
  }

  getStatus(): { minuteUsed: number; minuteLimit: number; dayUsed: number; dayLimit: number } {
    this.resetIfNecessary();
    return {
      minuteUsed: this.requestsThisMinute,
      minuteLimit: RATE_LIMIT.REQUESTS_PER_MINUTE,
      dayUsed: this.requestsToday,
      dayLimit: RATE_LIMIT.REQUESTS_PER_DAY,
    };
  }
}

// Global quota manager instance
const quotaManager = new QuotaManager();

/**
 * YouTube Data API v3 Client
 */
export class YouTubeClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.VITE_YOUTUBE_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('YouTube API key is required. Set VITE_YOUTUBE_API_KEY environment variable or pass apiKey to constructor.');
    }

    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  /**
   * Parse ISO 8601 duration string (PT1M30S) to seconds
   */
  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Handle API errors
   */
  private handleAPIError(response: Response, data?: any): never {
    const error: YouTubeError = {
      code: response.status,
      message: response.statusText || 'Unknown error',
    };

    if (data?.error) {
      error.reason = data.error.errors?.[0]?.reason;
      error.message = data.error.message || error.message;
    }

    throw new YouTubeAPIError(error);
  }

  /**
   * Execute API request with quota management
   */
  private async request<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    await quotaManager.waitForAvailability();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('key', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      quotaManager.recordRequest();

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleAPIError(response, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof YouTubeAPIError) {
        throw error;
      }
      throw new YouTubeAPIError({
        code: 0,
        message: error instanceof Error ? error.message : 'Network error',
      });
    }
  }

  /**
   * Search for YouTube videos
   */
  async searchVideos(options: YouTubeSearchOptions): Promise<YouTubeSearchResult> {
    const { query, maxResults = 10 } = options;

    if (!query || query.trim().length === 0) {
      throw new YouTubeAPIError({
        code: 400,
        message: 'Search query is required',
        reason: 'INVALID_QUERY',
      });
    }

    const data = await this.request<{
      items: Array<{
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          description: string;
          publishedAt: string;
          thumbnails: {
            default: { url: string; width: number; height: number };
            medium: { url: string; width: number; height: number };
            high: { url: string; width: number; height: number };
          };
        };
      }>;
      nextPageToken: string;
      pageInfo: { totalResults: number };
    }>('/search', {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      order: 'relevance',
      videoDefinition: 'high',
      videoEmbeddable: 'true',
    });

    const videos = data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.high || item.snippet.thumbnails.medium || item.snippet.thumbnails.default,
      duration: 0, // Will be filled by getVideoDetails if needed
      viewCount: 0,
      likeCount: 0,
    }));

    return {
      videos,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo?.totalResults,
    };
  }

  /**
   * Get detailed video information
   */
  async getVideoDetails(videoId: string): Promise<YouTubeVideoDetails> {
    if (!videoId || videoId.trim().length === 0) {
      throw new YouTubeAPIError({
        code: 400,
        message: 'Video ID is required',
        reason: 'INVALID_VIDEO_ID',
      });
    }

    const data = await this.request<{
      items: Array<{
        id: string;
        snippet: {
          title: string;
          channelTitle: string;
          description: string;
          publishedAt: string;
          thumbnails: {
            default: { url: string; width: number; height: number };
            medium: { url: string; width: number; height: number };
            high: { url: string; width: number; height: number };
            maxres: { url: string; width: number; height: number };
          };
        };
        contentDetails: {
          duration: string;
        };
        statistics: {
          viewCount: string;
          likeCount: string;
        };
      }>;
    }>('/videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoId,
    });

    if (!data.items || data.items.length === 0) {
      throw new YouTubeAPIError({
        code: 404,
        message: `Video not found: ${videoId}`,
        reason: 'VIDEO_NOT_FOUND',
      });
    }

    const item = data.items[0];

    return {
      videoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.maxres || item.snippet.thumbnails.high || item.snippet.thumbnails.medium || item.snippet.thumbnails.default,
      duration: this.parseDuration(item.contentDetails.duration),
      viewCount: parseInt(item.statistics.viewCount || '0', 10),
      likeCount: parseInt(item.statistics.likeCount || '0', 10),
    };
  }

  /**
   * Search videos with full details
   */
  async searchVideosWithDetails(options: YouTubeSearchOptions): Promise<YouTubeSearchResult> {
    const searchResult = await this.searchVideos(options);

    // Get details for each video in parallel
    const videosWithDetails = await Promise.all(
      searchResult.videos.map(video => this.getVideoDetails(video.videoId))
    );

    return {
      videos: videosWithDetails,
      nextPageToken: searchResult.nextPageToken,
      totalResults: searchResult.totalResults,
    };
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
    };
  }

  /**
   * Get current quota status
   */
  static getQuotaStatus(): ReturnType<QuotaManager['getStatus']> {
    return quotaManager.getStatus();
  }
}

/**
 * Custom error class for YouTube API errors
 */
export class YouTubeAPIError extends Error {
  public readonly code: number;
  public readonly reason?: string;

  constructor(error: YouTubeError) {
    super(error.message);
    this.name = 'YouTubeAPIError';
    this.code = error.code;
    this.reason = error.reason;
  }

  /**
   * Check if error is due to quota exceeded
   */
  isQuotaExceeded(): boolean {
    return this.code === 429 || this.reason === 'quotaExceeded';
  }

  /**
   * Check if error is due to invalid API key
   */
  isInvalidKey(): boolean {
    return this.code === 403 && (this.reason === 'keyInvalid' || this.reason === 'forbidden');
  }

  /**
   * Check if error is due to rate limiting
   */
  isRateLimited(): boolean {
    return this.code === 429;
  }
}

// Default client instance
let defaultClient: YouTubeClient | null = null;

/**
 * Get or create the default YouTube client
 */
export function getYouTubeClient(apiKey?: string): YouTubeClient {
  if (!defaultClient) {
    defaultClient = new YouTubeClient(apiKey);
  }
  return defaultClient;
}

/**
 * Reset the default client (useful for testing)
 */
export function resetYouTubeClient(): void {
  defaultClient = null;
}
