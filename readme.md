# WhatsApp CoinMarket Bot

A WhatsApp bot that provides real-time cryptocurrency information and market data using the CoinMarketCap API.

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
   git clone https://github.com/iblessdeno/whatsapp-coinmarket-bot.git
   cd whatsapp-coinmarket-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. The bot will prompt you to set up your CoinMarketCap API key when you first run it.

## Usage

1. Start the bot:
   ```
   npm start
   ```

2. Scan the QR code with WhatsApp to log in. The number you use to scan the QR code will automatically be set as the admin number.

3. The bot will prompt you to set up your CoinMarketCap API key. Send the API key in the format: `CMC="YOUR_API_KEY_HERE"` in the chat.

4. Once the API key is set, use the following commands in any WhatsApp chat:

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
   pm2 start main.js --name whatsapp-coinmarket-bot
   ```

5. Set up PM2 to start on boot:
   ```
   pm2 startup systemd
   ```

## Security

- The admin number is automatically set to the number used to scan the QR code.
- Only the admin can set or change the CoinMarketCap API key.
- The API key is stored securely in a local file (api_key.json) and is not exposed in the code.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This bot is for educational and informational purposes only. Do not use it for financial advice or making investment decisions.