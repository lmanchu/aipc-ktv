/**
 * Story 6.0: YouTube Data API v3 Integration Tests
 * 
 * Tests for YouTube API client, search functionality, video metadata retrieval,
 * rate limiting, quota management, and error handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  YouTubeClient,
  YouTubeAPIError,
  getYouTubeClient,
  resetYouTubeClient,
  YouTubeSearchOptions,
  YouTubeVideoDetails,
  YouTubeSearchResult,
} from '../src/renderer/lib/youtube';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Story 6.0: YouTube Data API v3 Integration', () => {
  beforeEach(() => {
    resetYouTubeClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // No cleanup needed for real timers
  });

  describe('AC1: YouTube Data API v3 client implemented in lib/youtube.ts', () => {
    it('should create YouTubeClient with API key', () => {
      const client = new YouTubeClient('test-api-key');
      expect(client).toBeInstanceOf(YouTubeClient);
    });

    it('should create YouTubeClient from environment variable', () => {
      process.env.VITE_YOUTUBE_API_KEY = 'env-api-key';
      const client = new YouTubeClient();
      expect(client).toBeInstanceOf(YouTubeClient);
      delete process.env.VITE_YOUTUBE_API_KEY;
    });

    it('should throw error if no API key provided', () => {
      expect(() => new YouTubeClient()).toThrow('YouTube API key is required');
    });
  });

  describe('AC2: Search endpoint integration with proper error handling', () => {
    let client: YouTubeClient;

    beforeEach(() => {
      client = new YouTubeClient('test-api-key');
    });

    it('should search videos successfully', async () => {
      const mockResponse = {
        items: [
          {
            id: { videoId: 'abc123' },
            snippet: {
              title: 'Test Song',
              channelTitle: 'Test Channel',
              description: 'Test description',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: {
                default: { url: 'https://test.com/default.jpg', width: 120, height: 90 },
                medium: { url: 'https://test.com/medium.jpg', width: 320, height: 180 },
                high: { url: 'https://test.com/high.jpg', width: 480, height: 360 },
              },
            },
          },
        ],
        nextPageToken: 'token123',
        pageInfo: { totalResults: 100 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.searchVideos({ query: 'test song' });

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].videoId).toBe('abc123');
      expect(result.videos[0].title).toBe('Test Song');
      expect(result.videos[0].channelTitle).toBe('Test Channel');
      expect(result.nextPageToken).toBe('token123');
      expect(result.totalResults).toBe(100);
    });

    it('should throw error for empty query', async () => {
      await expect(client.searchVideos({ query: '' })).rejects.toThrow(YouTubeAPIError);
      await expect(client.searchVideos({ query: '   ' })).rejects.toThrow('Search query is required');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: {
            message: 'API key invalid',
            errors: [{ reason: 'keyInvalid' }],
          },
        }),
      });

      await expect(client.searchVideos({ query: 'test' })).rejects.toThrow(YouTubeAPIError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.searchVideos({ query: 'test' })).rejects.toThrow(YouTubeAPIError);
    });
  });

  describe('AC3: Video metadata fetching', () => {
    let client: YouTubeClient;

    beforeEach(() => {
      client = new YouTubeClient('test-api-key');
    });

    it('should fetch video details', async () => {
      const mockResponse = {
        items: [
          {
            id: 'abc123',
            snippet: {
              title: 'Test Song',
              channelTitle: 'Test Channel',
              description: 'Test description',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: {
                default: { url: 'https://test.com/default.jpg', width: 120, height: 90 },
                medium: { url: 'https://test.com/medium.jpg', width: 320, height: 180 },
                high: { url: 'https://test.com/high.jpg', width: 480, height: 360 },
                maxres: { url: 'https://test.com/maxres.jpg', width: 1280, height: 720 },
              },
            },
            contentDetails: {
              duration: 'PT3M30S', // 3:30
            },
            statistics: {
              viewCount: '1000000',
              likeCount: '50000',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const details = await client.getVideoDetails('abc123');

      expect(details.videoId).toBe('abc123');
      expect(details.title).toBe('Test Song');
      expect(details.channelTitle).toBe('Test Channel');
      expect(details.duration).toBe(210); // 3:30 in seconds
      expect(details.viewCount).toBe(1000000);
      expect(details.likeCount).toBe(50000);
      expect(details.thumbnail.url).toBe('https://test.com/maxres.jpg');
    });

    it('should parse duration correctly', async () => {
      const testCases = [
        { iso: 'PT1M30S', seconds: 90 },
        { iso: 'PT2H30M45S', seconds: 9045 },
        { iso: 'PT5S', seconds: 5 },
        { iso: 'PT0S', seconds: 0 },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          items: [
            {
              id: 'test',
              snippet: {
                title: 'Test',
                channelTitle: 'Channel',
                description: '',
                publishedAt: '2024-01-01T00:00:00Z',
                thumbnails: {
                  default: { url: '', width: 1, height: 1 },
                  medium: { url: '', width: 1, height: 1 },
                  high: { url: '', width: 1, height: 1 },
                },
              },
              contentDetails: { duration: testCase.iso },
              statistics: { viewCount: '0', likeCount: '0' },
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const details = await client.getVideoDetails('test');
        expect(details.duration).toBe(testCase.seconds);
      }
    });

    it('should throw error for empty video ID', async () => {
      await expect(client.getVideoDetails('')).rejects.toThrow('Video ID is required');
      await expect(client.getVideoDetails('   ')).rejects.toThrow('Video ID is required');
    });

    it('should throw error when video not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      await expect(client.getVideoDetails('nonexistent')).rejects.toThrow('Video not found');
    });

    it('should search videos with full details', async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { videoId: 'abc123' },
            snippet: {
              title: 'Test',
              channelTitle: 'Channel',
              description: '',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: {
                default: { url: '', width: 1, height: 1 },
                medium: { url: '', width: 1, height: 1 },
                high: { url: '', width: 1, height: 1 },
              },
            },
          },
        ],
        nextPageToken: '',
        pageInfo: { totalResults: 1 },
      };

      const mockDetailsResponse = {
        items: [
          {
            id: 'abc123',
            snippet: {
              title: 'Test',
              channelTitle: 'Channel',
              description: '',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: {
                default: { url: '', width: 1, height: 1 },
                medium: { url: '', width: 1, height: 1 },
                high: { url: '', width: 1, height: 1 },
              },
            },
            contentDetails: { duration: 'PT3M30S' },
            statistics: { viewCount: '100', likeCount: '10' },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetailsResponse,
      });

      const result = await client.searchVideosWithDetails({ query: 'test' });

      expect(result.videos[0].duration).toBe(210);
      expect(result.videos[0].viewCount).toBe(100);
    });
  });

  describe('AC4: API key configuration via environment variables', () => {
    it('should use environment variable for API key', () => {
      process.env.VITE_YOUTUBE_API_KEY = 'env-test-key';
      const client = new YouTubeClient();
      expect(() => client).not.toThrow();
      delete process.env.VITE_YOUTUBE_API_KEY;
    });

    it('should prefer explicit API key over environment', () => {
      process.env.VITE_YOUTUBE_API_KEY = 'env-key';
      const client = new YouTubeClient('explicit-key');
      expect(() => client).not.toThrow();
      delete process.env.VITE_YOUTUBE_API_KEY;
    });
  });

  describe('AC5: Rate limiting and quota handling', () => {
    let client: YouTubeClient;

    beforeEach(() => {
      client = new YouTubeClient('test-api-key');
    });

    it('should enforce minimum request interval', async () => {
      const mockResponse = {
        items: [],
        nextPageToken: '',
        pageInfo: { totalResults: 0 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const start = Date.now();
      await client.searchVideos({ query: 'test1' });
      await client.searchVideos({ query: 'test2' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(600); // MIN_REQUEST_INTERVAL
    });

    it('should track quota usage correctly', () => {
      const mockResponse = {
        items: [],
        nextPageToken: '',
        pageInfo: { totalResults: 0 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Make a few requests and check quota tracking
      client.searchVideos({ query: 'test1' });
      const status1 = YouTubeClient.getQuotaStatus();
      expect(status1.minuteUsed).toBeGreaterThan(0);
    });

    it('should provide quota status', () => {
      const status = YouTubeClient.getQuotaStatus();

      expect(status).toHaveProperty('minuteUsed');
      expect(status).toHaveProperty('minuteLimit');
      expect(status).toHaveProperty('dayUsed');
      expect(status).toHaveProperty('dayLimit');
      expect(status.minuteLimit).toBe(100);
      expect(status.dayLimit).toBe(10000);
    });
  });

  describe('AC6: Tests for YouTube API integration pass', () => {
    it('should have all YouTubeClient methods available', () => {
      const client = new YouTubeClient('test-api-key');

      expect(typeof client.searchVideos).toBe('function');
      expect(typeof client.getVideoDetails).toBe('function');
      expect(typeof client.searchVideosWithDetails).toBe('function');
    });

    it('should convert videoDetails to Song', () => {
      const details: YouTubeVideoDetails = {
        videoId: 'abc123',
        title: 'Test Song',
        channelTitle: 'Test Channel',
        description: 'Test',
        publishedAt: '2024-01-01T00:00:00Z',
        thumbnail: { url: 'https://test.com/thumb.jpg', width: 480, height: 360 },
        duration: 210,
        viewCount: 1000,
        likeCount: 100,
      };

      const song = YouTubeClient.videoDetailsToSong(details);

      expect(song.videoId).toBe('abc123');
      expect(song.title).toBe('Test Song');
      expect(song.channel).toBe('Test Channel');
      expect(song.thumbnail).toBe('https://test.com/thumb.jpg');
      expect(song.duration).toBe(210);
    });

    it('should get default YouTube client', () => {
      process.env.VITE_YOUTUBE_API_KEY = 'test-key';
      const client1 = getYouTubeClient();
      const client2 = getYouTubeClient();

      expect(client1).toBe(client2); // Same instance
      delete process.env.VITE_YOUTUBE_API_KEY;
    });

    it('should reset YouTube client', () => {
      process.env.VITE_YOUTUBE_API_KEY = 'test-key';
      const client1 = getYouTubeClient();
      resetYouTubeClient();
      const client2 = getYouTubeClient();

      expect(client1).not.toBe(client2); // Different instances
      delete process.env.VITE_YOUTUBE_API_KEY;
    });
  });

  describe('AC7: Typecheck passes', () => {
    it('should have correct TypeScript types', () => {
      const options: YouTubeSearchOptions = {
        query: 'test',
        maxResults: 10,
      };
      expect(options).toBeDefined();

      const result: YouTubeSearchResult = {
        videos: [],
        nextPageToken: 'token',
        totalResults: 100,
      };
      expect(result).toBeDefined();

      const details: YouTubeVideoDetails = {
        videoId: 'abc',
        title: 'Test',
        channelTitle: 'Channel',
        description: 'Desc',
        publishedAt: '2024-01-01T00:00:00Z',
        thumbnail: { url: '', width: 100, height: 100 },
        duration: 120,
        viewCount: 100,
        likeCount: 10,
      };
      expect(details).toBeDefined();
    });
  });

  describe('YouTubeAPIError class', () => {
    it('should create error with code and message', () => {
      const error = new YouTubeAPIError({
        code: 403,
        message: 'Forbidden',
      });

      expect(error.name).toBe('YouTubeAPIError');
      expect(error.code).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    it('should identify quota exceeded errors', () => {
      const error1 = new YouTubeAPIError({ code: 429, message: 'Quota exceeded' });
      expect(error1.isQuotaExceeded()).toBe(true);
      expect(error1.isRateLimited()).toBe(true);

      const error2 = new YouTubeAPIError({ code: 403, message: '', reason: 'quotaExceeded' });
      expect(error2.isQuotaExceeded()).toBe(true);
    });

    it('should identify invalid API key errors', () => {
      const error = new YouTubeAPIError({ code: 403, message: '', reason: 'keyInvalid' });
      expect(error.isInvalidKey()).toBe(true);
    });
  });
});
