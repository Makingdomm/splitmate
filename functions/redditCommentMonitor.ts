/**
 * Reddit Comment Monitor
 * Searches for threads asking about Splitwise alternatives
 * and posts helpful comments with SplitMate link
 * 
 * Runs every 3 hours via automation
 */

interface SearchResult {
  id: string;
  title: string;
  subreddit: string;
  created_utc: number;
  permalink: string;
  author: string;
}

// Comment templates to vary the message (avoid bot detection)
const COMMENT_TEMPLATES = [
  "If you use Telegram, you should check out SplitMate — it's designed exactly for this. Works right inside your group chat, supports 150+ currencies, and even scans receipts with AI. Try it: https://t.me/SplitMateExpenseBot",
  
  "Telegram user here? SplitMate might be what you're looking for. It's a bot that handles splitting directly in your group without needing another app. Multi-currency support is great for travel groups too. https://t.me/SplitMateExpenseBot",
  
  "We were using Splitwise until we found SplitMate. It's a Telegram bot so zero friction — everything happens in the group chat. Unlimited expenses on the free tier. https://t.me/SplitMateExpenseBot",
  
  "Have you tried SplitMate? It's literally built for this exact problem. Live inside Telegram, tracks everything automatically, and the AI receipt scanner saves so much time. https://t.me/SplitMateExpenseBot"
];

const SEARCH_QUERIES = [
  "splitwise alternative",
  "split expenses app", 
  "expense splitting telegram",
  "bill split app",
  "tricount alternative"
];

const TARGET_SUBREDDITS = [
  "AskIndia",
  "digitalnomad", 
  "backpacking",
  "TravelHacks",
  "StudentLoans",
  "InternationalStudents",
  "PersonalFinance"
];

export default async function redditCommentMonitor(req: any) {
  try {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;
    
    if (!clientId || !clientSecret || !username || !password) {
      return { success: false, error: "Missing Reddit credentials" };
    }
    
    // Get access token
    const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "User-Agent": "SplitMateBot/1.0 by Material-Class8306"
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: username,
        password: password
      })
    });
    
    if (!tokenResponse.ok) {
      return { success: false, error: "Failed to authenticate with Reddit" };
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Store for tracking (you'd want a database table for this in production)
    const commentedThreads = new Set<string>();
    
    // Search for relevant threads
    const foundThreads: SearchResult[] = [];
    
    for (const subreddit of TARGET_SUBREDDITS) {
      for (const query of SEARCH_QUERIES.slice(0, 2)) { // Limit to avoid rate limit
        try {
          const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&sort=new&t=day&limit=10`;
          
          const searchResponse = await fetch(searchUrl, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "User-Agent": "SplitMateBot/1.0 by Material-Class8306"
            }
          });
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const threads = searchData.data?.children || [];
            
            for (const threadWrapper of threads) {
              const thread = threadWrapper.data;
              if (thread && !commentedThreads.has(thread.id)) {
                foundThreads.push({
                  id: thread.id,
                  title: thread.title,
                  subreddit: thread.subreddit,
                  created_utc: thread.created_utc,
                  permalink: thread.permalink,
                  author: thread.author
                });
              }
            }
          }
        } catch (e) {
          console.error(`Error searching r/${subreddit}:`, e);
        }
      }
    }
    
    // Post comments on found threads
    const postedComments = [];
    
    for (const thread of foundThreads.slice(0, 3)) { // Limit to 3 per run to avoid rate limit
      try {
        const comment = COMMENT_TEMPLATES[Math.floor(Math.random() * COMMENT_TEMPLATES.length)];
        
        const submitUrl = `https://oauth.reddit.com${thread.permalink}`;
        const commentResponse = await fetch(submitUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "User-Agent": "SplitMateBot/1.0 by Material-Class8306",
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            api_type: "json",
            text: comment
          })
        });
        
        if (commentResponse.ok) {
          postedComments.push({
            thread: thread.title,
            subreddit: thread.subreddit,
            posted: true
          });
          commentedThreads.add(thread.id);
        }
      } catch (e) {
        console.error(`Error posting comment on ${thread.id}:`, e);
      }
    }
    
    return {
      success: true,
      searched: foundThreads.length,
      posted: postedComments.length,
      comments: postedComments
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
