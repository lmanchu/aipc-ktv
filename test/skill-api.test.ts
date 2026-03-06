import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import http from 'node:http'

// --- Mocks for Electron globals used by the API server ---
const mockWinSend = vi.fn()
const mockDisplayWinSend = vi.fn()

let queueState = {
  currentSong: null as any,
  upcomingSongs: [] as any[],
  playbackState: 'idle',
}
let displayWin: any = null
let win: any = null

const mockSearchYouTube = vi.fn()

// --- Recreate API handler logic (mirrors electron/main/index.ts) ---
function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: string) => { body += chunk })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) }
      catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function jsonResponse(res: http.ServerResponse, status: number, data: any) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(data))
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = reqUrl.pathname

  try {
    if (req.method === 'GET' && pathname === '/api/status') {
      return jsonResponse(res, 200, {
        currentSong: queueState.currentSong,
        upcomingSongs: queueState.upcomingSongs,
        playbackState: queueState.playbackState,
        queueLength: queueState.upcomingSongs.length,
        displayWindowOpen: !!displayWin,
      })
    }

    if (req.method === 'GET' && pathname === '/api/queue') {
      return jsonResponse(res, 200, {
        currentSong: queueState.currentSong,
        upcomingSongs: queueState.upcomingSongs,
      })
    }

    if (req.method === 'POST' && pathname === '/api/queue/add') {
      const body = await parseBody(req)
      let song: any = null

      if (body.videoId) {
        song = {
          videoId: body.videoId,
          title: body.title || 'YouTube Video',
          channel: body.channel || '',
          thumbnail: `https://i.ytimg.com/vi/${body.videoId}/hqdefault.jpg`,
          duration: body.duration || 0,
        }
      } else if (body.query) {
        const results = await mockSearchYouTube(body.query, 1)
        if (results.length > 0) {
          song = results[0]
        } else {
          return jsonResponse(res, 404, { error: 'No results found', query: body.query })
        }
      } else {
        return jsonResponse(res, 400, { error: 'Provide videoId or query' })
      }

      if (win && !win.isDestroyed()) {
        win.webContents.send('api-add-song', song)
      }
      return jsonResponse(res, 200, { success: true, song })
    }

    if (req.method === 'POST' && pathname === '/api/search') {
      const body = await parseBody(req)
      if (!body.query) {
        return jsonResponse(res, 400, { error: 'Provide query' })
      }
      const results = await mockSearchYouTube(body.query, body.maxResults || 5)
      return jsonResponse(res, 200, { results })
    }

    if (req.method === 'POST' && pathname === '/api/player/skip') {
      if (win && !win.isDestroyed()) {
        win.webContents.send('api-skip-song')
      }
      return jsonResponse(res, 200, { success: true })
    }

    if (req.method === 'POST' && pathname === '/api/player/volume') {
      const body = await parseBody(req)
      if (displayWin) {
        displayWin.webContents.send('youtube-player-control', 'set-volume', body.volume ?? 100)
      }
      return jsonResponse(res, 200, { success: true, volume: body.volume })
    }

    if (req.method === 'POST' && pathname === '/api/queue/clear') {
      if (win && !win.isDestroyed()) {
        win.webContents.send('api-clear-queue')
      }
      return jsonResponse(res, 200, { success: true })
    }

    jsonResponse(res, 404, { error: 'Not found', endpoints: [
      'GET  /api/status',
      'GET  /api/queue',
      'POST /api/queue/add    {videoId,title} or {query}',
      'POST /api/queue/clear',
      'POST /api/search       {query, maxResults?}',
      'POST /api/player/skip',
      'POST /api/player/volume {volume: 0-100}',
    ]})
  } catch (err) {
    jsonResponse(res, 500, { error: String(err) })
  }
}

// --- Test infrastructure ---
let server: http.Server
let port: number

function req(method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    }

    const r = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          data: data ? JSON.parse(data) : null,
        })
      })
    })

    r.on('error', reject)
    if (body) r.write(JSON.stringify(body))
    r.end()
  })
}

describe('Skill HTTP API', () => {
  beforeAll(() => {
    return new Promise<void>((resolve) => {
      server = http.createServer(handleRequest)
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as any).port
        resolve()
      })
    })
  })

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  beforeEach(() => {
    queueState = { currentSong: null, upcomingSongs: [], playbackState: 'idle' }
    win = { webContents: { send: mockWinSend }, isDestroyed: () => false }
    displayWin = { webContents: { send: mockDisplayWinSend } }
    mockWinSend.mockClear()
    mockDisplayWinSend.mockClear()
    mockSearchYouTube.mockReset()
  })

  describe('GET /api/status', () => {
    it('returns idle state when queue is empty', async () => {
      const { status, data } = await req('GET', '/api/status')
      expect(status).toBe(200)
      expect(data.currentSong).toBeNull()
      expect(data.upcomingSongs).toEqual([])
      expect(data.playbackState).toBe('idle')
      expect(data.queueLength).toBe(0)
      expect(data.displayWindowOpen).toBe(true)
    })

    it('reflects current queue state', async () => {
      queueState.currentSong = { videoId: 'abc123', title: 'Test Song' }
      queueState.upcomingSongs = [{ videoId: 'def456', title: 'Next Song' }]
      queueState.playbackState = 'playing'

      const { status, data } = await req('GET', '/api/status')
      expect(status).toBe(200)
      expect(data.currentSong.videoId).toBe('abc123')
      expect(data.queueLength).toBe(1)
      expect(data.playbackState).toBe('playing')
    })

    it('reports displayWindowOpen=false when no display', async () => {
      displayWin = null
      const { data } = await req('GET', '/api/status')
      expect(data.displayWindowOpen).toBe(false)
    })
  })

  describe('GET /api/queue', () => {
    it('returns queue contents', async () => {
      queueState.currentSong = { videoId: 'v1', title: 'Song 1' }
      queueState.upcomingSongs = [
        { videoId: 'v2', title: 'Song 2' },
        { videoId: 'v3', title: 'Song 3' },
      ]

      const { status, data } = await req('GET', '/api/queue')
      expect(status).toBe(200)
      expect(data.currentSong.videoId).toBe('v1')
      expect(data.upcomingSongs).toHaveLength(2)
    })
  })

  describe('POST /api/queue/add', () => {
    it('adds song by videoId', async () => {
      const { status, data } = await req('POST', '/api/queue/add', {
        videoId: 'abc123',
        title: 'My Song',
      })
      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.song.videoId).toBe('abc123')
      expect(data.song.title).toBe('My Song')
      expect(data.song.thumbnail).toContain('abc123')
      expect(mockWinSend).toHaveBeenCalledWith('api-add-song', data.song)
    })

    it('defaults title to "YouTube Video" when not provided', async () => {
      const { data } = await req('POST', '/api/queue/add', { videoId: 'xyz' })
      expect(data.song.title).toBe('YouTube Video')
    })

    it('adds song by search query', async () => {
      const mockSong = { videoId: 'found1', title: 'Found Song', channel: 'Ch', thumbnail: 'thumb', duration: 180 }
      mockSearchYouTube.mockResolvedValue([mockSong])

      const { status, data } = await req('POST', '/api/queue/add', { query: 'test song' })
      expect(status).toBe(200)
      expect(data.song.videoId).toBe('found1')
      expect(mockSearchYouTube).toHaveBeenCalledWith('test song', 1)
    })

    it('returns 404 when search finds nothing', async () => {
      mockSearchYouTube.mockResolvedValue([])

      const { status, data } = await req('POST', '/api/queue/add', { query: 'nonexistent' })
      expect(status).toBe(404)
      expect(data.error).toBe('No results found')
    })

    it('returns 400 when no videoId or query', async () => {
      const { status, data } = await req('POST', '/api/queue/add', {})
      expect(status).toBe(400)
      expect(data.error).toBe('Provide videoId or query')
    })
  })

  describe('POST /api/search', () => {
    it('returns search results', async () => {
      const results = [
        { videoId: 'a', title: 'Song A' },
        { videoId: 'b', title: 'Song B' },
      ]
      mockSearchYouTube.mockResolvedValue(results)

      const { status, data } = await req('POST', '/api/search', { query: 'test', maxResults: 2 })
      expect(status).toBe(200)
      expect(data.results).toHaveLength(2)
      expect(mockSearchYouTube).toHaveBeenCalledWith('test', 2)
    })

    it('defaults maxResults to 5', async () => {
      mockSearchYouTube.mockResolvedValue([])
      await req('POST', '/api/search', { query: 'test' })
      expect(mockSearchYouTube).toHaveBeenCalledWith('test', 5)
    })

    it('returns 400 without query', async () => {
      const { status, data } = await req('POST', '/api/search', {})
      expect(status).toBe(400)
      expect(data.error).toBe('Provide query')
    })
  })

  describe('POST /api/player/skip', () => {
    it('sends skip IPC to control window', async () => {
      const { status, data } = await req('POST', '/api/player/skip')
      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockWinSend).toHaveBeenCalledWith('api-skip-song')
    })
  })

  describe('POST /api/player/volume', () => {
    it('sends volume IPC to display window', async () => {
      const { status, data } = await req('POST', '/api/player/volume', { volume: 75 })
      expect(status).toBe(200)
      expect(data.volume).toBe(75)
      expect(mockDisplayWinSend).toHaveBeenCalledWith('youtube-player-control', 'set-volume', 75)
    })

    it('defaults to 100 when volume not specified', async () => {
      await req('POST', '/api/player/volume', {})
      expect(mockDisplayWinSend).toHaveBeenCalledWith('youtube-player-control', 'set-volume', 100)
    })
  })

  describe('POST /api/queue/clear', () => {
    it('sends clear IPC to control window', async () => {
      const { status, data } = await req('POST', '/api/queue/clear')
      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockWinSend).toHaveBeenCalledWith('api-clear-queue')
    })
  })

  describe('Unknown endpoints', () => {
    it('returns 404 with endpoint list', async () => {
      const { status, data } = await req('GET', '/api/unknown')
      expect(status).toBe(404)
      expect(data.error).toBe('Not found')
      expect(data.endpoints).toBeInstanceOf(Array)
      expect(data.endpoints.length).toBe(7)
    })
  })

  describe('CORS', () => {
    it('handles OPTIONS preflight', async () => {
      return new Promise<void>((resolve, reject) => {
        const r = http.request({
          hostname: '127.0.0.1',
          port,
          path: '/api/status',
          method: 'OPTIONS',
        }, (res) => {
          expect(res.statusCode).toBe(204)
          expect(res.headers['access-control-allow-origin']).toBe('*')
          expect(res.headers['access-control-allow-methods']).toContain('POST')
          res.resume()
          res.on('end', () => resolve())
        })
        r.on('error', reject)
        r.end()
      })
    })
  })
})
