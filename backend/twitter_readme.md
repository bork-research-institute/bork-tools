# Twitter Integration Documentation

## Overview
This document outlines the Twitter integration architecture, focusing on API flow and rate limiting processes. The system uses a custom Twitter scraper client and implements various mechanisms to ensure responsible API usage and data quality.

## Architecture Components

### 1. Core Services

#### TwitterService
- Main service orchestrating Twitter interactions
- Handles tweet searching, user timeline fetching, and content filtering
- Integrates with caching and spam filtering services
- Implements engagement-based filtering

#### TwitterAuthService
- Manages Twitter authentication
- Implements cookie-based authentication
- Features retry mechanism with exponential backoff
- Retry Configuration:
  - Max retries: 3
  - Base delay: 3000ms
  - Exponential backoff between retries

#### TwitterRequestService
- Manages request queuing and rate limiting
- Implements a 1-second delay between requests
- Handles request failures and retries

### 2. Client Components

#### TwitterAccountsClient
- Monitors target accounts
- Implements configurable polling intervals
- Manages tweet collection and filtering based on engagement metrics

#### TwitterSearchClient
- Handles search operations
- Implements configurable search intervals
- Manages engagement with search results

### 3. Rate Limiting and Protection Mechanisms

#### Request Queue System
```typescript
// Delay between requests
await new Promise((resolve) => setTimeout(resolve, 1000));
```

#### Search Configuration
```typescript
const TWITTER_CONFIG = {
  search: {
    maxRetries: 5,
    retryDelay: 10000,
    searchInterval: {
      min: 15,
      max: 30
    }
  }
}
```

#### Tweet Limits
- Target Accounts: 20 tweets per fetch
- Quality Tweets: 5 per account
- Accounts to Process: 3 per cycle
- Search Results: 20 tweets per search

### 4. Quality Control Mechanisms

#### Engagement Thresholds
```typescript
engagementThresholds: {
  minLikes: 10,
  minRetweets: 1,
  minReplies: 1
}
```

#### Spam Detection
- Filters tweets based on hashtag density
- Limits:
  - Maximum 1 hashtag
  - Maximum 2 @ mentions
  - Maximum 1 $ symbol
  - Total combined limit: 3

#### Content Parameters
```typescript
parameters: {
  excludeReplies: true,
  excludeRetweets: true,
  filterLevel: 'low' // Options: 'none' | 'low' | 'medium' | 'high'
}
```

### 5. Account Discovery and Management

#### Account Evaluation Metrics
- Relevance Score (minimum: 0.6)
- Quality Score (minimum: 0.5)
- Score Decay Factor: 0.95 (5% decay per check)
- Maximum Tracked Accounts: 100

#### Scoring System
- Engagement Weights:
  - Likes: 1x
  - Retweets: 2x
  - Replies: 1.5x

## Best Practices

### Rate Limiting
1. Always use the request queue system for API calls
2. Implement appropriate delays between requests
3. Use exponential backoff for retries
4. Monitor and respect Twitter's rate limits

### Data Quality
1. Apply engagement thresholds consistently
2. Use spam detection mechanisms
3. Implement content filtering
4. Regular evaluation of account quality

### Error Handling
1. Implement proper error logging
2. Use retry mechanisms with backoff
3. Handle authentication failures gracefully
4. Cache responses when possible

## Configuration Management

### Database Schema
The system uses a PostgreSQL database to store Twitter configurations:
- Username-based configuration
- Customizable thresholds
- Engagement metrics
- Search parameters

### Default Configuration
```sql
username: 'default',
target_accounts: ['elonmusk', 'melondotdev', 'theflamesolana', 'citadelwolff', '0xMert_', 'aeyakovenko'],
max_retries: 5,
retry_delay: 10000,
search_interval_min: 15,
search_interval_max: 30
```

## Monitoring and Maintenance

### Key Metrics to Monitor
1. Request success rates
2. Authentication status
3. Rate limit usage
4. Content quality metrics
5. Account discovery performance

### Regular Maintenance Tasks
1. Review and update engagement thresholds
2. Monitor account quality scores
3. Update target accounts list
4. Review and adjust rate limiting parameters 