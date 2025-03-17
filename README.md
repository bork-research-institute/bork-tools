
# eggsight

A sophisticated analytics platform that provides real-time metrics, insights, and visualizations for cryptocurrency and social media data.

## Features

### Dashboard & Analytics
- **Metrics Gallery**: Comprehensive dashboard with multiple data panels
- **Market Stats**: Real-time cryptocurrency market statistics and trends
- **Token Holder Analysis**: Tracks and analyzes token holder patterns
- **Relationship Visualization**: Graph-based visualization of network relationships
- **Sentiment Analysis**: Social media sentiment tracking and analysis
- **Twitter Integration**: Trending tweets and social media metrics
- **Kaito Leaderboard**: Performance tracking and rankings
- **Bundler Analytics**: Backend infrastructure performance metrics
- **X-Analysis**: Advanced Twitter/X analytics and insights

### Technical Components

#### Frontend (Next.js)
- Modern React.js with TypeScript implementation
- Server-side rendering with Next.js 15
- Responsive design with TailwindCSS
- Interactive data visualizations
- Real-time data updates
- Wallet integration with Solana adapters

#### Backend (Bun/Elysia)
- Fast API server using Bun runtime and Elysia
- Messaging service for real-time updates
- Agent-based architecture for distributed processing
- Blockchain integration with Injective Labs SDK
- Twitter API integration for social media analytics

## Getting Started

### Prerequisites
- Node.js (v23.3.0 recommended)
- Bun runtime (v1.2.2+)

### Installation

```bash
# Clone the repository
git clone https://github.com/bork-research-institute/bork-tools.git
cd bork-tools

# Install dependencies
bun install
# OR use the script
bun run install:all
```

### Environment Setup

The project uses dotenvx for environment management. Create the following files:
- `.env.frontend.production` - Frontend environment variables
- `.env.backend.production` - Backend environment variables
- `.env.keys` - API keys and sensitive credentials

### Running the Project

#### Development Mode

```bash
# Start the frontend (runs on port 3001)
bun run dev

# Start the backend (runs on port 3002)
bun run backend:dev
```

#### Production Build

```bash
# Build the frontend
bun run build

# Start the frontend in production mode
bun run --cwd frontend start
```

## API Examples

The backend provides various API endpoints for data retrieval:

```bash
# Example API call
curl -X GET "http://localhost:3002/api/stakers?after=2025-03-06T16:08:24Z"
```

## Technologies

- **Frontend**: React, Next.js, TypeScript, TailwindCSS, Radix UI
- **Backend**: Bun, Elysia, TypeScript
- **Data Visualization**: React Force Graph 2D
- **Wallet Integration**: Solana Wallet Adapter
- **API Integration**: Injective Labs, Twitter API
- **Environment Management**: DotenvX

## License

[License information]

## Contact

[Contact information]
