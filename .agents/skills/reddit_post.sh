#!/bin/bash
# Reddit Post Skill
# Usage: reddit_post.sh <subreddit> <title> <body>
# Posts to Reddit using API credentials from .env

source /app/.agents/.env

SUBREDDIT="$1"
TITLE="$2"
BODY="$3"

# Get access token
TOKEN=$(curl -s -X POST "https://www.reddit.com/api/v1/access_token" \
  -u "$REDDIT_CLIENT_ID:$REDDIT_CLIENT_SECRET" \
  -d "grant_type=password&username=$REDDIT_USERNAME&password=$REDDIT_PASSWORD" \
  -H "User-Agent: SplitMateBot/1.0 by Material-Class8306" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get Reddit token"
  exit 1
fi

# Submit post
RESPONSE=$(curl -s -X POST "https://oauth.reddit.com/api/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "User-Agent: SplitMateBot/1.0 by Material-Class8306" \
  -d "sr=$SUBREDDIT&kind=self&title=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$TITLE")&text=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$BODY")&resubmit=true")

echo "$RESPONSE"
