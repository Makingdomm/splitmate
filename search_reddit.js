const https = require('https');

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function searchThreads() {
  const queries = [
    'splitwise alternative',
    'split expenses app',
    'expense splitting telegram',
    'tricount alternative',
    'bill split app'
  ];

  const sinceTime = Math.floor(Date.now() / 1000) - (3 * 3600); // Last 3 hours
  const results = [];

  for (const query of queries) {
    console.log(`Searching: "${query}"`);
    
    const options = {
      hostname: 'www.reddit.com',
      path: `/search.json?q=${encodeURIComponent(query)}&type=link&sort=new&limit=25`,
      method: 'GET',
      headers: {
        'User-Agent': 'SplitMateBot/1.0'
      }
    };

    try {
      const res = await makeRequest(options);
      if (res.status === 200 && res.body.data) {
        const posts = res.body.data.children
          .filter(item => item.data.created_utc > sinceTime)
          .map(item => ({
            id: item.data.id,
            title: item.data.title,
            subreddit: item.data.subreddit,
            url: item.data.url,
            created: new Date(item.data.created_utc * 1000).toISOString()
          }));
        
        results.push(...posts);
        console.log(`  → Found ${posts.length} recent threads`);
      }
    } catch (e) {
      console.error(`  → Error: ${e.message}`);
    }
  }

  return results;
}

searchThreads().then(results => {
  console.log(`\n=== Total recent threads: ${results.length} ===`);
  results.slice(0, 10).forEach(p => {
    console.log(`- r/${p.subreddit}: "${p.title}"`);
  });
});
