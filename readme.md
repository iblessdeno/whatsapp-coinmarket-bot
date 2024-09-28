# CryptoBot

CryptoBot is a WhatsApp bot that provides real-time cryptocurrency information and market data using the CoinMarketCap API.

## Features

- Real-time cryptocurrency prices
- Historical price data
- Top 10 cryptocurrencies by market cap
- Trending cryptocurrencies (gainers and losers)
- Detailed cryptocurrency information
- Top cryptocurrency exchanges
- Recent airdrop news

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- CoinMarketCap API key

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/cryptobot.git
   cd cryptobot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `config.json` file in the project root and add your CoinMarketCap API key:
   ```json
   {
     "CMC_API_KEY": "your-api-key-here"
   }
   ```

## Usage

1. Start the bot:
   ```
   npm start
   ```

2. Scan the QR code with WhatsApp to log in.

3. Use the following commands in any WhatsApp chat:

   - `!help`: Show available commands
   - `!price [symbol] [currency]`: Get current price of a cryptocurrency
   - `!historical [symbol] [YYYY-MM-DD] [currency]`: Get historical data
   - `!top10`: Get top 10 cryptocurrencies by market cap
   - `!trending [type] [currency]`: Get trending gainers and losers
   - `!info [symbol]`: Get detailed information about a cryptocurrency
   - `!exchanges [limit]`: Get top cryptocurrency exchanges
   - `!airdrop`: Get recent airdrop news

## Deployment

To deploy the bot on an Ubuntu VPS:

1. Install Node.js and npm:
   ```
   sudo apt update
   sudo apt install nodejs npm
   ```

2. Install PM2 for process management:
   ```
   sudo npm install -g pm2
   ```

3. Clone the repository and install dependencies as described in the Installation section.

4. Start the bot with PM2:
   ```
   pm2 start main.js --name cryptobot
   ```

5. Set up PM2 to start on boot:
   ```
   pm2 startup systemd
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This bot is for educational and informational purposes only. Do not use it for financial advice or making investment decisions.