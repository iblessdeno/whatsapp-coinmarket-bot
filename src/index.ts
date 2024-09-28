import { initializeWhatsAppClient } from './whatsapp/client';
import { startBot } from './bot/bot';

async function main() {
  console.log('Initializing WhatsApp client...');
  const client = await initializeWhatsAppClient();
  
  console.log('Starting bot...');
  await startBot(client);
}

main().catch(console.error);