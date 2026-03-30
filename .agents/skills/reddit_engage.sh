#!/bin/bash
# Reddit Comment Engagement Skill
# Posts a comment on a Reddit thread
# Usage: reddit_engage.sh <post_id> <comment_body>

source /app/.agents/.env

POST_ID="$1"
COMMENT="$2"

TOKEN=$(curl -s -X POST "https://www.reddit.com/api/v1/access_token" \
  -u "$REDDIT_CLIENT_ID:$REDDIT_CLIENT_SECRET" \
  -d "grant_type=password&username=$REDDIT_USERNAME&password=$REDDIT_PASSWORD" \
  -H "User-Agent: SplitMateBot/1.0 by Material-Class8306" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get Reddit token"
  exit 1
fi

RESPONSE=$(curl -s -X POST "https://oauth.reddit.com/api/comment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "User-Agent: SplitMateBot/1.0 by Material-Class8306" \
  --data-urlencode "thing_id=t3_$POST_ID" \
  --data-urlencode "text=$COMMENT" \
  --data-urlencode "api_type=json")

echo "$RESPONSE"
