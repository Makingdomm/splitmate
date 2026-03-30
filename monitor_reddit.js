const https = require('https');

// Helper to make HTTP requests
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Get OAuth token from Reddit
async function getRedditToken(clientId, clientSecret, username, password) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  
  const options = {
    hostname: 'www.reddit.com',
    path: '/api/v1/access_token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': 'SplitMateBot/1.0',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': body.length
    }
  };

  const res = await makeRequest(options, body);
  if (res.status !== 200) {
    throw new Error(`Reddit auth failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.access_token;
}

// Search Reddit for threads
async function searchReddit(token, query, hoursBack = 3) {
  const sinceTime = Math.floor(Date.now() / 1000) - (hoursBack * 3600);
  
  const options = {
    hostname: 'oauth.reddit.com',
    path: `/search?q=${encodeURIComponent(query)}&type=link&sort=new&limit=10`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'SplitMateBot/1.0'
    }
  };

  const res = await makeRequest(options);
  if (res.status !== 200) {
    throw new Error(`Search failed: ${res.status}`);
  }

  // Filter posts from last 3 hours
  const posts = res.body.data.children
    .filter(item => item.data.created_utc > sinceTime)
    .map(item => ({
      id: item.data.id,
      title: item.data.title,
      url: item.data.url,
      subreddit: item.data.subreddit,
      fullname: item.data.name,
      created: item.data.created_utc
    }));

  return posts;
}

// Get comments on a post to check if we already commented
async function getPostComments(token, postId) {
  const options = {
    hostname: 'oauth.reddit.com',
    path: `/r/*/comments/${postId}?limit=100`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'SplitMateBot/1.0'
    }
  };

  const res = await makeRequest(options);
  if (res.status !== 200) {
    return [];
  }

  // Extract all comments
  const comments = [];
  function extractComments(data) {
    if (data.children) {
      data.children.forEach(child => {
        if (child.data && child.data.author) {
          comments.push(child.data.author);
        }
        if (child.data && child.data.replies) {
          extractComments(child.data.replies.data);
        }
      });
    }
  }

  if (res.body[1]) extractComments(res.body[1].data);
  return comments;
}

// Post a comment
async function postComment(token, postFullname, text) {
  const body = `api_type=json&return_rtjson=true&text=${encodeURIComponent(text)}&thing_id=${postFullname}`;
  
  const options = {
    hostname: 'oauth.reddit.com',
    path: '/api/comment',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'SplitMateBot/1.0',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': body.length
    }
  };

  const res = await makeRequest(options, body);
  return res.status === 200;
}

// Main automation
async function runMonitor() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    console.error('Missing Reddit credentials');
    return { posted: 0, error: 'Missing credentials' };
  }

  try {
    console.log('Getting Reddit auth token...');
    const token = await getRedditToken(clientId, clientSecret, username, password);
    console.log('Token acquired');

    const queries = [
      'splitwise alternative',
      'split expenses app',
      'expense splitting telegram',
      'tricount alternative',
      'bill split app'
    ];

    const comments = [
      "If you use Telegram, SplitMate might be exactly what you need — it works right inside your group chats, supports multiple currencies, and even scans receipts with AI. No separate app needed: https://t.me/SplitMateExpenseBot",
      "Been looking for the same thing. SplitMate is a Telegram bot that handles all of this without needing a separate app. Just add it to your group, log expenses, done. Works with 150+ currencies too: https://t.me/SplitMateExpenseBot",
      "Check out SplitMate if your group uses Telegram. It's free, works directly in chat, handles multi-currency, and has AI receipt scanning. No download needed: https://t.me/SplitMateExpenseBot",
      "For Telegram users, SplitMate solves this perfectly — expense tracking without leaving your chat. Supports every currency imaginable and even scans bills with AI. Worth checking out: https://t.me/SplitMateExpenseBot"
    ];

    let totalPosted = 0;
    const results = [];

    for (const query of queries) {
      console.log(`\nSearching for: "${query}"`);
      const posts = await searchReddit(token, query, 3);
      console.log(`Found ${posts.length} recent posts`);

      for (const post of posts) {
        console.log(`  Checking post: "${post.title}" in r/${post.subreddit}`);
        
        // Get existing comments to check if we already replied
        const existingComments = await getPostComments(token, post.id);
        const ourUsername = username.toLowerCase();
        
        if (existingComments.some(author => author && author.toLowerCase() === ourUsername)) {
          console.log(`    → Already commented on this post, skipping`);
          continue;
        }

        // Post a comment with varied wording
        const selectedComment = comments[totalPosted % comments.length];
        console.log(`    → Posting comment...`);
        
        const success = await postComment(token, post.fullname, selectedComment);
        if (success) {
          totalPosted++;
          results.push(`✓ Posted in r/${post.subreddit}`);
          console.log(`    → Success!`);
          
          // Small delay between posts to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log(`    → Failed to post`);
        }
      }
    }

    return { posted: totalPosted, results };
  } catch (error) {
    console.error('Error:', error.message);
    return { posted: 0, error: error.message };
  }
}

runMonitor().then(result => {
  console.log('\n=== MONITOR RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.posted >= 0 ? 0 : 1);
});
