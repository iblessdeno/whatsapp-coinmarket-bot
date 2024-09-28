# WhatsApp CoinMarket Bot

A WhatsApp bot that runs entirely in the terminal, providing cryptocurrency information using the CoinMarketCap API.

## Prerequisites

- Node.js (v14 or higher recommended)
- npm (Node Package Manager)
- A VPS running Ubuntu (for deployment)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/iblessdeno/whatsapp-coinmarket-bot.git
   cd whatsapp-coinmarket-bot
   ```

2. Install dependencies:
   ```
   npm install whatsapp-web.js qrcode-terminal axios dotenv
   ```

## Local Deployment

1. Start the bot:
   ```
   node main.js
   ```

2. When prompted, scan the QR code with your WhatsApp mobile app to authenticate.

3. The bot is now running and will respond to messages based on your implemented logic.

## VPS Deployment (Ubuntu)

1. Connect to your VPS via SSH.

2. Update the system and install Node.js and npm:
   ```
   sudo apt update
   sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Install PM2 for process management:
   ```
   sudo npm install -g pm2
   ```

4. Clone the repository and install dependencies:
   ```
   git clone https://github.com/iblessdeno/whatsapp-coinmarket-bot.git
   cd whatsapp-coinmarket-bot
   npm install
   ```

5. Start the bot with PM2:
   ```
   pm2 start main.js --name whatsapp-coinmarket-bot
   ```

6. Set up PM2 to start on boot:
   ```
   pm2 startup systemd
   ```
   Follow the instructions provided by the command.

7. Save the PM2 process list:
   ```
   pm2 save
   ```

8. To view the bot's console output:
   ```
   pm2 logs whatsapp-coinmarket-bot
   ```

## Session Management

- On subsequent runs, you'll be presented with options to resume the session, logout, or exit.
- To clear the session and start fresh, choose the logout option.

## Project Structure

- `main.js`: Main bot logic and client initialization
- `sessionCleaner.js`: Handles session cleanup operations
- `src/index.ts`: TypeScript source for additional functionality

## Customization

Modify the message handling logic in `main.js` to add your own commands and responses.

## Troubleshooting

If you encounter session-related issues:
1. Ensure no other processes are accessing the session files.
2. Run the script with administrator privileges if needed.
3. Manually delete the `.wwebjs_auth` folder as a last resort.

## Required Modules

- whatsapp-web.js: WhatsApp Web API
- qrcode-terminal: Generates QR codes in the terminal
- axios: HTTP client for making API requests
- dotenv: Loads environment variables from a .env file

Install these modules using: