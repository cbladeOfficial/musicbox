export interface OnlineStationResult {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  codec: string;
  bitrate: number;
  votes: number;
}

const SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

async function fetchFromRadioBrowser<T>(endpoint: string): Promise<T[]> {
  for (const server of SERVERS) {
    try {
      const res = await fetch(`${server}${endpoint}`, {
        headers: {
          'User-Agent': 'MusicBox-Desktop/1.0',
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      continue;
    }
  }
  return [];
}

export const RadioBrowserService = {
  async searchStations(query: string): Promise<OnlineStationResult[]> {
    if (!query.trim()) return this.getTopStations();
    return fetchFromRadioBrowser<OnlineStationResult>(
      `/json/stations/search?name=${encodeURIComponent(query.trim())}&limit=40&hidebroken=true&order=votes&reverse=true`
    );
  },

  async getTopStations(limit = 40): Promise<OnlineStationResult[]> {
    return fetchFromRadioBrowser<OnlineStationResult>(
      `/json/stations/topclick/${limit}?hidebroken=true`
    );
  },

  async getStationsByTag(tag: string, limit = 40): Promise<OnlineStationResult[]> {
    return fetchFromRadioBrowser<OnlineStationResult>(
      `/json/stations/bytag/${encodeURIComponent(tag.trim())}?limit=${limit}&hidebroken=true&order=votes&reverse=true`
    );
  },
};
