const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const readline = require('readline');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const rimraf = require('rimraf');
const { createCanvas, loadImage } = require('canvas');
const Chart = require('chart.js/auto');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const stringSimilarity = require('string-similarity');
const fuzzysort = require('fuzzysort');

// Add this variable at the top of the file, replacing the existing CMC_API_KEY
let CMC_API_KEY = null;

// Add this variable near the top of the file, after let CMC_API_KEY = null;
let waitingForApiKey = false;
let apiKeySetupMessageId = null;

// Add this near the top of the file, with other variable declarations
let expectingApiKey = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Modify these variables at the top of the file
const cooldowns = new Map();
const COOLDOWN_AMOUNT = 5000; // 5 seconds in milliseconds

// Add this near the top of your file, with other imports and global variables
const requestTimes = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_MINUTE = 30; // Adjust based on your API plan

// Add this function to check rate limits
function checkRateLimit(userId) {
    const now = Date.now();
    const userRequests = requestTimes.get(userId) || [];
    const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
        return false;
    }
    
    recentRequests.push(now);
    requestTimes.set(userId, recentRequests);
    return true;
}

// Add this near the top of your file, with other global variables
const API_KEY_FILE = path.join(__dirname, 'api_key.json');

async function saveApiKey(number, apiKey) {
    const data = { number, apiKey };
    await fs.writeFile(API_KEY_FILE, JSON.stringify(data, null, 2));
}

async function loadApiKey() {
    try {
        const data = await fs.readFile(API_KEY_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No saved API key found.');
            return null;
        }
        console.error('Error loading API key:', error);
        return null;
    }
}

// Modify the client configuration
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
        headless: false, // Set to false for debugging
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--disable-gpu',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-dev-shm-usage'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        userDataDir: path.join(__dirname, '.wwebjs_auth', 'session'),
        restartOnAuthFail: true,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 10000
    }
});

let isLoggedIn = false;

// Modify the checkLoginStatus function
async function checkLoginStatus() {
    const sessionFolder = path.join(__dirname, '.wwebjs_auth');
    try {
        console.log(`Checking for session in: ${sessionFolder}`);
        const files = await fs.readdir(sessionFolder);
        console.log(`Files found in auth folder: ${files.join(', ')}`);
        
        // Check for the 'session' folder
        if (files.includes('session')) {
            const sessionFiles = await fs.readdir(path.join(sessionFolder, 'session'));
            console.log(`Files found in session folder: ${sessionFiles.join(', ')}`);
            
            // Check for the 'Default' folder within the 'session' folder
            if (sessionFiles.includes('Default')) {
                const defaultFiles = await fs.readdir(path.join(sessionFolder, 'session', 'Default'));
                console.log(`Files found in Default folder: ${defaultFiles.join(', ')}`);
                
                // Check for specific files that indicate an active session
                const hasSession = defaultFiles.some(file => 
                    file.startsWith('Local Storage') || 
                    file.startsWith('IndexedDB') || 
                    file === 'Cookies'
                );
                
                console.log(`Session ${hasSession ? 'found' : 'not found'}`);
                return hasSession;
            }
        }
        
        console.log('Session not found');
        return false;
    } catch (error) {
        console.error('Error checking login status:', error);
        return false;
    }
}

// Modify the showMenu function
async function showMenu() {
    console.log('\nWhatsApp Bot Menu:');
    console.log('1. Check for session');
    console.log('2. Exit');
    rl.question('Choose an option: ', handleMenuChoice);
}

// Modify the handleMenuChoice function
async function handleMenuChoice(choice) {
    switch (choice) {
        case '1':
            const hasSession = await checkLoginStatus();
            console.log(`checkLoginStatus result: ${hasSession}`);
            if (hasSession) {
                console.log('\nExisting session found.');
                console.log('1. Resume Session');
                console.log('2. Logout');
                console.log('3. Exit');
                rl.question('Choose an option: ', handleSessionChoice);
            } else {
                console.log('\nNo existing session found.');
                console.log('1. Login');
                console.log('2. Exit');
                rl.question('Choose an option: ', handleNoSessionChoice);
            }
            break;
        case '2':
            console.log('Exiting...');
            rl.close();
            process.exit(0);
        default:
            console.error('Invalid option. Please try again.');
            showMenu();
    }
}

// Add new function to handle choices when a session exists
async function handleSessionChoice(choice) {
    switch (choice) {
        case '1':
            if (!isLoggedIn) {
                console.log('Resuming existing session...');
                initializeClient();
            } else {
                console.log('Already logged in.');
                showMenu();
            }
            break;
        case '2':
            console.log('Logging out...');
            try {
                if (client && typeof client.destroy === 'function') {
                    await client.destroy();
                }
                isLoggedIn = false;
                console.log('Logged out successfully.');
            } catch (error) {
                console.error('Error during logout:', error);
            }
            console.log('Attempting to clean up session files...');
            await cleanupSessionFiles();
            showMenu();
            break;
        case '3':
            console.log('Exiting...');
            if (isLoggedIn) {
                try {
                    await client.destroy();
                } catch (error) {
                    console.error('Error during logout:', error);
                }
            }
            rl.close();
            process.exit(0);
        default:
            console.error('Invalid option. Please try again.');
            showMenu();
    }
}

// Add new function to handle choices when no session exists
async function handleNoSessionChoice(choice) {
    switch (choice) {
        case '1':
            console.log('Initializing new client...');
            initializeClient();
            break;
        case '2':
            console.log('Exiting...');
            rl.close();
            process.exit(0);
        default:
            console.error('Invalid option. Please try again.');
            showMenu();
    }
}

// Add more detailed error logging
client.on('error', (error) => {
    console.error('Client error:', error);
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    isLoggedIn = false;
    client.initialize();
});

// Modify the initialize process
async function initializeClient() {
    try {
        console.log('Starting client initialization...');
        await client.initialize();
        console.log('Client initialized successfully.');
        isLoggedIn = true;
    } catch (error) {
        console.error('Error initializing client:', error);
        if (error.message.includes('Execution context was destroyed')) {
            console.log('Attempting to reinitialize...');
            setTimeout(initializeClient, 5000); // Retry after 5 seconds
        } else {
            console.error('Unrecoverable error. Please restart the application.');
            process.exit(1);
        }
    }
}

async function retryDelete(filePath, maxRetries = 5, delay = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await fs.unlink(filePath);
            console.log(`Successfully deleted: ${filePath}`);
            return;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`File doesn't exist, considered deleted: ${filePath}`);
                return;
            }
            console.warn(`Attempt ${i + 1} failed to delete ${filePath}: ${error.message}`);
            if (i === maxRetries - 1) {
                console.error(`Failed to delete ${filePath} after ${maxRetries} attempts`);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function cleanupSessionFiles() {
    const sessionFolder = path.join(__dirname, '.wwebjs_auth', 'session');
    try {
        const files = await fs.readdir(sessionFolder);
        for (const file of files) {
            if (file !== 'Default' && !file.endsWith('.json')) {
                const filePath = path.join(sessionFolder, file);
                await retryDelete(filePath);
                await new Promise(resolve => setTimeout(resolve, 500)); // Add a small delay between deletions
            }
        }
        console.log('Session cleanup completed');
    } catch (error) {
        console.error('Error during session cleanup:', error);
    }
}

// When the client receives a QR code
client.on('qr', (qr) => {
    console.log('Scan the QR code below to log in:');
    qrcode.generate(qr, { small: true });
});

// Add this new event listener for successful authentication
client.on('authenticated', () => {
    console.log('Bot successfully linked!');
    isLoggedIn = true;
});

// Modify the client.on('ready') event
client.on('ready', async () => {
    console.log('Client is ready!');
    isLoggedIn = true;
    
    // Set the admin number
    ADMIN_NUMBER = client.info.wid.user;
    console.log(`Admin number set to: ${ADMIN_NUMBER}`);
    
    await setupCMCApiKey();
});

// Add this new function
async function setupCMCApiKey() {
    const savedData = await loadApiKey();
    if (savedData) {
        CMC_API_KEY = savedData.apiKey;
        console.log(`Loaded saved API key for number: ${savedData.number}`);
        return;
    }

    const chats = await client.getChats();
    const adminChat = chats.find(chat => chat.id.user === ADMIN_NUMBER);
    
    const welcomeMessage = `Welcome! Please send your CoinMarketCap API key in the following format:
CMC="YOUR_API_KEY_HERE"

If you don't have an API key, you can get one from: https://pro.coinmarketcap.com/account`;
    
    if (adminChat) {
        await adminChat.sendMessage(welcomeMessage);
        waitingForApiKey = true;
        expectingApiKey = true;
    } else {
        console.log('Could not find admin chat. Please send your CoinMarketCap API key to any chat in the format: CMC="YOUR_API_KEY_HERE"');
    }
}

// Add these variables at the top of the file, after the imports
let processingMessage = false;

// Add this near the top of your file, with other global variables
let ADMIN_NUMBER = null;

// Modify the message_create event handler
client.on('message_create', async (message) => {
    console.log(`Received message: ${message.body}`); // Debug log

    try {
        // Check if the message is from the bot itself
        if (message.fromMe && !waitingForApiKey) {
            console.log('Ignoring message from bot');
            return;
        }

        // API key handling
        if (waitingForApiKey) {
            console.log('Waiting for API key');
            if (message.from === ADMIN_NUMBER) {
                const apiKeyMatch = message.body.match(/^CMC="([^"]+)"$/);
                if (apiKeyMatch) {
                    CMC_API_KEY = apiKeyMatch[1].trim();
                    console.log('API key set:', CMC_API_KEY);
                    await saveApiKey(message.from, CMC_API_KEY);
                    await message.reply('Thank you! Your CoinMarketCap API key has been set and saved. You can now use the bot commands.');
                    waitingForApiKey = false;
                    expectingApiKey = false;
                    
                    // Send a confirmation message to the user
                    const chat = await message.getChat();
                    await chat.sendMessage('Your API key has been successfully set and saved. The bot is now ready to use. Type !help to see available commands.');
                    
                    return;
                } else if (message.body.toLowerCase().includes('cmc') || message.body.includes('"')) {
                    await message.reply('Invalid API key format. Please use the format: CMC="YOUR_API_KEY_HERE"');
                    return;
                }
            } else {
                console.log('Ignoring API key message from non-admin user');
                return;
            }
        }

        // Only ignore messages from the bot if we're not waiting for the API key and the API key is not set
        if (message.fromMe && !waitingForApiKey && !CMC_API_KEY) {
            console.log('Ignoring message from bot');
            return;
        }

        if (!CMC_API_KEY) {
            console.log('No API key set');
            await message.reply('Please set your CoinMarketCap API key first using the format: CMC="YOUR_API_KEY_HERE"');
            return;
        }

        // Implement cooldown
        const now = Date.now();
        if (cooldowns.has(message.from)) {
            const expirationTime = cooldowns.get(message.from) + COOLDOWN_AMOUNT;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                console.log(`Cooldown active for ${message.from}. ${timeLeft.toFixed(1)} seconds left.`);
                return;
            }
        }

        cooldowns.set(message.from, now);
        console.log(`Processing message: ${message.body}`);

        const command = message.body.split(' ')[0].toLowerCase();
        const args = message.body.split(' ').slice(1);

        console.log(`Command: ${command}, Args: ${args}`);

        switch (command) {
            case '!ping':
                await message.reply('pong');
                break;

            case '!echo':
                const echoMessage = args.join(' ');
                await message.reply(echoMessage);
                break;

            case '!chatinfo':
                const chat = await message.getChat();
                const chatInfo = `
Chat Info:
Name: ${chat.name}
Is Group: ${chat.isGroup}
Participants: ${chat.participants ? chat.participants.length : 'N/A'}
                `;
                await message.reply(chatInfo);
                break;

            case '!price':
                if (args.length < 1) {
                    await message.reply('Please provide a cryptocurrency symbol. Usage: !price [symbol] [currency]');
                    return;
                }
                const symbol = args[0].toUpperCase();
                const currency = args[1] ? args[1].toUpperCase() : 'USD';
                await handlePriceCommand(message, symbol, currency);
                break;

            case '!top10':
                await handleTop10Command(message);
                break;

            case '!help':
                await handleHelpCommand(message);
                break;

            case '!historical':
                if (args.length < 1) {
                    await message.reply('Please provide a cryptocurrency symbol. Usage: !historical [symbol] [YYYY-MM-DD] [currency]');
                    return;
                }
                const histSymbol = args[0].toUpperCase();
                const histDate = args.length > 1 ? args[1] : null;
                const histCurrency = args.length > 2 ? args[2].toUpperCase() : 'USD';
                await handleHistoricalCommand(message, histSymbol, histDate, histCurrency);
                break;

            case '!trending':
                const trendingType = args[0] ? args[0].toLowerCase() : 'all';
                const trendingCurrency = args[1] ? args[1].toUpperCase() : 'USD';
                await handleTrendingCommand(message, trendingType, trendingCurrency);
                break;

            case '!info':
                if (args.length < 1) {
                    await message.reply('Please provide a cryptocurrency symbol. Usage: !info [symbol]');
                    return;
                }
                const infoSymbol = args[0].toUpperCase();
                await handleInfoCommand(message, infoSymbol);
                break;

            case '!exchanges':
                const limit = args[0] ? parseInt(args[0]) : 10;
                await handleExchangesCommand(message, limit);
                break;

            case '!airdrop':
                await handleAirdropCommand(message);
                break;

            default:
                const closestCommand = findClosestCommand(command);
                if (closestCommand) {
                    await message.reply(`Did you mean "${closestCommand}"? Type !help for a list of available commands.`);
                } else {
                    await message.reply('Unknown command. Type !help for a list of available commands.');
                }
        }
    } catch (error) {
        console.error('Error processing message:', error);
        await message.reply('Sorry, an error occurred while processing your request. Please try again later.');
    }
});

// Add this function to find the closest matching command
function findClosestCommand(input) {
    const commands = ['!ping', '!echo', '!chatinfo', '!price', '!top10', '!help'];
    const result = fuzzysort.go(input, commands, {threshold: -0.2});
    return result.length > 0 ? result[0].target : null;
}

// Make sure these functions are defined
async function handlePriceCommand(message, symbol, currency = 'USD') {
    const userId = message.from;
    if (!checkRateLimit(userId)) {
        await message.reply('Rate limit exceeded. Please try again later.');
        return;
    }

    console.log(`Handling price command for symbol: ${symbol} in currency: ${currency}`);
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
            params: { symbol: symbol, convert: currency },
            headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY }
        });

        if (response.data.status.error_code !== 0) {
            throw new Error(`API Error: ${response.data.status.error_message}`);
        }

        const coinData = response.data.data[symbol];
        if (coinData) {
            const price = coinData.quote[currency].price;
            const percentageChange = coinData.quote[currency].percent_change_24h;
            const coinName = coinData.name;
            const logoUrl = `https://s2.coinmarketcap.com/static/img/coins/64x64/${coinData.id}.png`;

            console.log(`Generating price image for ${coinName} in ${currency}...`);
            const imagePath = await generatePriceImage(coinName, symbol, price, percentageChange, logoUrl, currency);
            console.log(`Image generated: ${imagePath}`);

            const media = MessageMedia.fromFilePath(imagePath);
            await message.reply(media, undefined, { caption: `Showing results for ${coinName} (${symbol}) in ${currency}` });

            await fs.unlink(imagePath);
        } else {
            await message.reply(`Sorry, I couldn't find a cryptocurrency with the symbol "${symbol}". Please try again with a different symbol.`);
        }
    } catch (error) {
        console.error('Error in cryptocurrency price command:', error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            switch (status) {
                case 400:
                    await message.reply('Bad request. Please check your input and try again.');
                    break;
                case 401:
                    await message.reply('Unauthorized. There might be an issue with the API key.');
                    break;
                case 403:
                    await message.reply('Access denied. Please check your API plan and permissions.');
                    break;
                case 429:
                    await message.reply('Too many requests. Please try again later.');
                    break;
                case 500:
                    await message.reply('Internal server error. Please try again later.');
                    break;
                default:
                    await message.reply('An error occurred while fetching the price. Please try again later.');
            }
        } else if (error.message.includes('API Error')) {
            await message.reply(error.message);
        } else {
            await message.reply('An unexpected error occurred. Please try again later.');
        }
    }
}

async function handleTop10Command(message) {
    const userId = message.from;
    if (!checkRateLimit(userId)) {
        await message.reply('Rate limit exceeded. Please try again later.');
        return;
    }

    console.log('Handling top10 command');
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
            params: {
                limit: 10,
                convert: 'USD'
            },
            headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY }
        });

        if (response.data.status.error_code !== 0) {
            throw new Error(`API Error: ${response.data.status.error_message}`);
        }

        const top10 = response.data.data;
        const imagePath = await generateTop10Image(top10);

        const media = MessageMedia.fromFilePath(imagePath);
        await message.reply(media, undefined, { caption: 'Top 10 Cryptocurrencies by Market Cap' });

        await fs.unlink(imagePath);
    } catch (error) {
        console.error('Error in top10 command:', error);
        handleApiError(message, error);
    }
}

async function handleHelpCommand(message) {
    console.log('Handling help command');
    const helpMessage = `🚀 CryptoBot Command List 🚀

1. !ping
   🏓 Bot responds with 'pong'

2. !echo [message]
   🗣️ Bot echoes your message

3. !chatinfo
   💬 Get information about the current chat

4. !price [symbol] [currency]
   💰 Get the current price of a cryptocurrency in a specified currency

5. !historical [symbol] [YYYY-MM-DD] [currency]
   📅 Get historical data for a cryptocurrency on a specific date
   (date and currency are optional)

6. !top10
   🏆 Get the top 10 cryptocurrencies by market cap

7. !trending [type] [currency]
   📈 Get trending gainers and losers
   (type can be 'all', 'gainers', or 'losers'; currency is optional)

8. !info [symbol]
   ℹ️ Get detailed information about a specific cryptocurrency

9. !exchanges [limit]
   🏛️ Get information about top cryptocurrency exchanges
   (limit is optional, default is 10)

10. !airdrop
    🪂 Get information about ongoing cryptocurrency airdrops

11. !help
    📚 Show this help message

Need more assistance? Feel free to ask! 😊`;

    await message.reply(helpMessage);
}
async function generatePriceImage(coinName, symbol, price, percentageChange, logoUrl, currency) {
    const width = 1080;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Set background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Add chalkboard texture
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 100000; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.02})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Load and draw logo
    try {
        const logo = await loadImage(logoUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(100, 100, 80, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logo, 20, 20, 160, 160);
        ctx.restore();
    } catch (error) {
        console.error('Error loading logo:', error);
    }

    // Draw coin name and symbol
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(coinName, 200, 100);
    ctx.font = 'italic bold 40px Arial';
    ctx.fillStyle = '#FF6B6B';
    ctx.fillText(`$${symbol}`, 200, 150);

    // Format the price
    let formattedPrice;
    if (price >= 1) {
        formattedPrice = price.toFixed(2);
    } else {
        formattedPrice = price.toFixed(8);
    }

    // Draw current price
    ctx.font = 'bold 120px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(`${currency} ${formattedPrice}`, width / 2, height / 2 - 30);

    // Draw percentage change
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = percentageChange >= 0 ? '#4cd137' : '#e84118';
    ctx.fillText(`${percentageChange.toFixed(2)}%`, width / 2, height / 2 + 60);

    // Draw price chart (placeholder, you can implement actual chart later)
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, height - 100);
    for (let i = 0; i < 10; i++) {
        ctx.lineTo(100 + i * 100, height - 100 - Math.random() * 200);
    }
    ctx.stroke();

    // Draw date
    const date = new Date().toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric'
    }).toUpperCase();
    ctx.font = '30px Arial';
    ctx.fillStyle = '#FF69B4';
    ctx.textAlign = 'right';
    ctx.fillText(date, width - 30, height - 30);

    // Save the image
    const buffer = canvas.toBuffer('image/png');
    const imagePath = path.join(__dirname, `${symbol}_price.png`);
    await fs.writeFile(imagePath, buffer);
    return imagePath;
}

async function handleHistoricalCommand(message, symbol, date, currency = 'USD') {
    const userId = message.from;
    if (!checkRateLimit(userId)) {
        await message.reply('Rate limit exceeded. Please try again later.');
        return;
    }

    // If date is not provided, use yesterday's date (as today's data might not be complete)
    if (!date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        date = yesterday.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }

    console.log(`Handling historical command for symbol: ${symbol}, date: ${date}, currency: ${currency}`);
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/historical', {
            params: {
                symbol: symbol,
                time_start: `${date}T00:00:00Z`,
                time_end: `${date}T23:59:59Z`,
                count: 1,
                interval: '24h',
                convert: currency
            },
            headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY }
        });

        if (response.data.status.error_code !== 0) {
            throw new Error(`API Error: ${response.data.status.error_message}`);
        }

        const coinData = response.data.data[symbol];
        if (coinData && coinData.quotes && coinData.quotes.length > 0) {
            const historicalData = coinData.quotes[0];
            const price = historicalData.quote[currency].price;
            const marketCap = historicalData.quote[currency].market_cap;
            const volume24h = historicalData.quote[currency].volume_24h;
            const coinName = coinData.name;

            const replyMessage = `Historical data for ${coinName} (${symbol}) on ${date} in ${currency}:
Price: ${currency} ${price.toFixed(2)}
Market Cap: ${currency} ${marketCap.toFixed(2)}
24h Volume: ${currency} ${volume24h.toFixed(2)}`;

            await message.reply(replyMessage);
        } else {
            await message.reply(`Sorry, I couldn't find historical data for "${symbol}" on ${date}. The date might be invalid or data is not available.`);
        }
    } catch (error) {
        console.error('Error in cryptocurrency historical command:', error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            switch (status) {
                case 400:
                    await message.reply('Bad request. Please check your input and try again.');
                    break;
                case 401:
                    await message.reply('Unauthorized. There might be an issue with the API key.');
                    break;
                case 403:
                    await message.reply('Access denied. Please check your API plan and permissions.');
                    break;
                case 429:
                    await message.reply('Too many requests. Please try again later.');
                    break;
                case 500:
                    await message.reply('Internal server error. Please try again later.');
                    break;
                default:
                    await message.reply('An error occurred while fetching historical data. Please try again later.');
            }
        } else if (error.message.includes('API Error')) {
            await message.reply(error.message);
        } else {
            await message.reply('An unexpected error occurred. Please try again later.');
        }
    }
}

async function handleTrendingCommand(message, type = 'all', currency = 'USD') {
    const userId = message.from;
    if (!checkRateLimit(userId)) {
        await message.reply('Rate limit exceeded. Please try again later.');
        return;
    }

    console.log(`Handling trending command for type: ${type}, currency: ${currency}`);
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/trending/gainers-losers', {
            params: {
                sort_dir: 'desc',
                limit: 10,
                convert: currency
            },
            headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY }
        });

        if (response.data.status.error_code !== 0) {
            throw new Error(`API Error: ${response.data.status.error_message}`);
        }

        const trendingData = response.data.data;
        let replyMessage = `Trending cryptocurrencies in ${currency}:\n\n`;

        if (type === 'gainers' || type === 'all') {
            replyMessage += 'Top Gainers:\n';
            trendingData.top_gainers.slice(0, 5).forEach((coin, index) => {
                replyMessage += `${index + 1}. ${coin.symbol}: ${coin.quote[currency].percent_change_24h.toFixed(2)}%\n`;
            });
            replyMessage += '\n';
        }

        if (type === 'losers' || type === 'all') {
            replyMessage += 'Top Losers:\n';
            trendingData.top_losers.slice(0, 5).forEach((coin, index) => {
                replyMessage += `${index + 1}. ${coin.symbol}: ${coin.quote[currency].percent_change_24h.toFixed(2)}%\n`;
            });
        }

        await message.reply(replyMessage);
    } catch (error) {
        console.error('Error in cryptocurrency trending command:', error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            switch (status) {
                case 400:
                    await message.reply('Bad request. Please check your input and try again.');
                    break;
                case 401:
                    await message.reply('Unauthorized. There might be an issue with the API key.');
                    break;
                case 403:
                    await message.reply('Access denied. Please check your API plan and permissions.');
                    break;
                case 429:
                    await message.reply('Too many requests. Please try again later.');
                    break;
                case 500:
                    await message.reply('Internal server error. Please try again later.');
                    break;
                default:
                    await message.reply('An error occurred while fetching trending data. Please try again later.');
            }
        } else if (error.message.includes('API Error')) {
            await message.reply(error.message);
        } else {
            await message.reply('An unexpected error occurred. Please try again later.');
        }
    }
}

async function handleInfoCommand(message, symbol) {
    const userId = message.from;
    if (!checkRateLimit(userId)) {
        await message.reply('Rate limit exceeded. Please try again later.');
        return;
    }

    console.log(`Handling info command for symbol: ${symbol}`);
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/info', {
            params: { symbol: symbol },
            headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY }
        });

        if (response.data.status.error_code !== 0) {
            throw new Error(`API Error: ${response.data.status.error_message}`);
        }

        const coinData = response.data.data[symbol];
        if (coinData) {
            const info = `
*${coinData.name} (${symbol})*

*Category:* ${coinData.category}
*Date Added:* ${new Date(coinData.date_added).toLocaleDateString()}
*Platform:* ${coinData.platform ? coinData.platform.name : 'N/A'}
*Contract Address:* ${coinData.platform ? coinData.platform.token_address : 'N/A'}

*Description:* 
${coinData.description}

*Website:* ${coinData.urls.website[0] || 'N/A'}
*Technical Documentation:* ${coinData.urls.technical_doc[0] || 'N/A'}
*Source Code:* ${coinData.urls.source_code[0] || 'N/A'}
*Explorer:* ${coinData.urls.explorer[0] || 'N/A'}

*Social Media:*
Twitter: ${coinData.urls.twitter[0] || 'N/A'}
Reddit: ${coinData.urls.reddit[0] || 'N/A'}
Chat: ${coinData.urls.chat[0] || 'N/A'}

*Logo:* ${coinData.logo}
            `;

            await message.reply(info);
        } else {
            await message.reply(`Sorry, I couldn't find information for the cryptocurrency with symbol "${symbol}". Please check the symbol and try again.`);
        }
    } catch (error) {
        console.error('Error in cryptocurrency info command:', error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            switch (status) {
                case 400:
                    await message.reply('Bad request. Please check your input and try again.');
                    break;
                case 401:
                    await message.reply('Unauthorized. There might be an issue with the API key.');
                    break;
                case 403:
                    await message.reply('Access denied. Please check your API plan and permissions.');
                    break;
                case 429:
                    await message.reply('Too many requests. Please try again later.');
                    break;
                case 500:
                    await message.reply('Internal server error. Please try again later.');
                    break;
                default:
                    await message.reply('An error occurred while fetching cryptocurrency information. Please try again later.');
            }
        } else if (error.message.includes('API Error')) {
            await message.reply(error.message);
        } else {
            await message.reply('An unexpected error occurred. Please try again later.');
        }
    }
}

async function handleExchangesCommand(message, limit = 10) {
    const userId = message.from;
    if (!checkRateLimit(userId)) {
        await message.reply('Rate limit exceeded. Please try again later.');
        return;
    }

    console.log(`Handling exchanges command with limit: ${limit}`);
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/exchange/map', {
            params: {
                limit: limit,
                sort: 'volume_24h'
            },
            headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY }
        });

        if (response.data.status.error_code !== 0) {
            throw new Error(`API Error: ${response.data.status.error_message}`);
        }

        const exchanges = response.data.data;
        let replyMessage = `Top ${limit} Cryptocurrency Exchanges:\n\n`;

        exchanges.forEach((exchange, index) => {
            replyMessage += `${index + 1}. ${exchange.name}\n`;
            replyMessage += `   Slug: ${exchange.slug}\n`;
            replyMessage += `   First Listed: ${new Date(exchange.first_historical_data).toLocaleDateString()}\n`;
            if (exchange.urls && exchange.urls.website) {
                replyMessage += `   Website: ${exchange.urls.website[0]}\n`;
            }
            replyMessage += '\n';
        });

        await message.reply(replyMessage);
    } catch (error) {
        console.error('Error in cryptocurrency exchanges command:', error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            switch (status) {
                case 400:
                    await message.reply('Bad request. Please check your input and try again.');
                    break;
                case 401:
                    await message.reply('Unauthorized. There might be an issue with the API key.');
                    break;
                case 403:
                    await message.reply('Access denied. Please check your API plan and permissions.');
                    break;
                case 429:
                    await message.reply('Too many requests. Please try again later.');
                    break;
                case 500:
                    await message.reply('Internal server error. Please try again later.');
                    break;
                default:
                    await message.reply('An error occurred while fetching exchange data. Please try again later.');
            }
        } else if (error.message.includes('API Error')) {
            await message.reply(error.message);
        } else {
            await message.reply('An unexpected error occurred. Please try again later.');
        }
    }
}

// Add this function to handle the airdrop command
async function handleAirdropCommand(message) {
    const userId = message.from;
    if (!checkRateLimit(userId)) {
        await message.reply('Rate limit exceeded. Please try again later.');
        return;
    }

    console.log('Handling airdrop command');
    try {
        // Using CryptoCompare News API as an alternative
        const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/', {
            params: {
                lang: 'EN',
                categories: 'Airdrops',
                sortOrder: 'latest',
                limit: 5
            }
        });

        if (!response.data || !response.data.Data) {
            throw new Error('Invalid response from the news API');
        }

        const airdrops = response.data.Data;
        let replyMessage = 'Recent Airdrop News:\n\n';

        airdrops.forEach((news, index) => {
            replyMessage += `${index + 1}. ${news.title}\n`;
            replyMessage += `   Published: ${new Date(news.published_on * 1000).toLocaleDateString()}\n`;
            replyMessage += `   Source: ${news.source}\n`;
            replyMessage += `   Link: ${news.url}\n\n`;
        });

        if (airdrops.length === 0) {
            replyMessage = 'No recent airdrop news found.';
        }

        await message.reply(replyMessage);
    } catch (error) {
        console.error('Error in airdrop command:', error);
        handleApiError(message, error);
    }
}

// Add this function to generate the top 10 image
async function generateTop10Image(top10) {
    const width = 1080;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Set background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Add title
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Top 10 Cryptocurrencies', width / 2, 60);

    // Add cryptocurrencies
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    top10.forEach((coin, index) => {
        const y = 120 + index * 90;
        ctx.fillStyle = 'white';
        ctx.fillText(`${index + 1}. ${coin.name} (${coin.symbol})`, 50, y);
        ctx.fillStyle = '#4cd137';
        ctx.fillText(`$${coin.quote.USD.price.toFixed(2)}`, 50, y + 30);
        ctx.fillStyle = coin.quote.USD.percent_change_24h >= 0 ? '#4cd137' : '#e84118';
        ctx.fillText(`${coin.quote.USD.percent_change_24h.toFixed(2)}%`, 50, y + 60);
    });

    // Add date
    const date = new Date().toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric'
    }).toUpperCase();
    ctx.font = '24px Arial';
    ctx.fillStyle = '#FF69B4';
    ctx.textAlign = 'right';
    ctx.fillText(date, width - 30, height - 30);

    // Save the image
    const buffer = canvas.toBuffer('image/png');
    const imagePath = path.join(__dirname, 'top10_cryptocurrencies.png');
    await fs.writeFile(imagePath, buffer);
    return imagePath;
}

// Add this helper function to handle API errors
function handleApiError(message, error) {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        switch (status) {
            case 400:
                message.reply('Bad request. Please check your input and try again.');
                break;
            case 401:
                message.reply('Unauthorized. There might be an issue with the API key.');
                break;
            case 403:
                message.reply('Access denied. Please check your API plan and permissions.');
                break;
            case 429:
                message.reply('Too many requests. Please try again later.');
                break;
            case 500:
                message.reply('Internal server error. Please try again later.');
                break;
            default:
                message.reply('An error occurred while fetching data. Please try again later.');
        }
    } else if (error.message.includes('API Error')) {
        message.reply(error.message);
    } else {
        message.reply('An unexpected error occurred. Please try again later.');
    }
}

// Add this at the end of the file
console.log('Script started. Showing menu...');
showMenu();