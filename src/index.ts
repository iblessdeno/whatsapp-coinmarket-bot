import { initializeWhatsAppClient } from './whatsapp/client';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let client: any;
let adminNumber: string | null = null;

async function showMenu() {
  console.log('\nWhatsApp Bot Menu:');
  console.log('1. Resume Session');
  console.log('2. Logout');
  console.log('3. Add Admin');
  console.log('4. Exit');
  rl.question('Choose an option: ', handleMenuChoice);
}

async function handleMenuChoice(choice: string) {
  switch (choice) {
    case '1':
      console.log('Resuming session...');
      client = await initializeWhatsAppClient();
      // Add your bot logic here
      break;
    case '2':
      console.log('Logging out...');
      if (client) {
        await client.logout();
      }
      console.log('Logged out successfully.');
      showMenu();
      break;
    case '3':
      rl.question('Enter the admin phone number (with country code, no spaces or symbols): ', (number) => {
        adminNumber = number;
        console.log(`Admin number set to: ${adminNumber}`);
        showMenu();
      });
      break;
    case '4':
      console.log('Exiting...');
      rl.close();
      process.exit(0);
    default:
      console.log('Invalid option. Please try again.');
      showMenu();
  }
}

async function main() {
  console.log('WhatsApp Terminal Bot');
  showMenu();
}

main().catch(console.error);