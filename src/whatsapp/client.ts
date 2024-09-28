import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

// ... existing imports ...

export async function initializeWhatsAppClient(): Promise<Client> {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ['--no-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('Scan the QR code below to log in:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('Client is ready!');
  });

  await client.initialize();

  return client;
}

// ... rest of the file ...