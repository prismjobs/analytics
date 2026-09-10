export const api = {
  async parseAd(url, userId) {
    const response = await fetch('/.netlify/functions/parseAd', {
      method: 'POST',
      body: JSON.stringify({ url, userId })
    });
    return response.json();
  },

  async updateSnapshots(userId) {
    const response = await fetch('/.netlify/functions/updateSnapshots', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    return response.json();
  },

  async getAnalytics(userId, segmento = 'all') {
    const response = await fetch('/.netlify/functions/analytics', {
      method: 'POST',
      body: JSON.stringify({ userId, segmento })
    });
    return response.json();
  },

  async getAds(userId) {
    const response = await fetch('/.netlify/functions/getAds', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    return response.json();
  }
};
