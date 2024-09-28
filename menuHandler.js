const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function showInitialMenu(initializeClient, checkLoginStatus, clearSession) {
    console.log('\nWhatsApp Bot Initial Menu:');
    console.log('1. Check Login Session');
    console.log('2. Exit');
    rl.question('Choose an option: ', (choice) => handleInitialChoice(choice, initializeClient, checkLoginStatus, clearSession));
}

async function handleInitialChoice(choice, initializeClient, checkLoginStatus, clearSession) {
    switch (choice) {
        case '1':
            const hasSession = await checkLoginStatus();
            if (hasSession) {
                showMainMenu(initializeClient, clearSession);
            } else {
                showNoSessionMenu(initializeClient, clearSession);
            }
            break;
        case '2':
            console.log('Exiting...');
            rl.close();
            process.exit(0);
        default:
            console.log('Invalid option. Please try again.');
            showInitialMenu(initializeClient, checkLoginStatus, clearSession);
    }
}

async function showNoSessionMenu(initializeClient, clearSession) {
    console.log('\nNo Session Found:');
    console.log('1. Login');
    console.log('2. Exit');
    console.log('3. Back');
    rl.question('Choose an option: ', (choice) => handleNoSessionChoice(choice, initializeClient, clearSession));
}

async function handleNoSessionChoice(choice, initializeClient, clearSession) {
    switch (choice) {
        case '1':
            await promptAdminNumber();
            break;
        case '2':
            console.log('Exiting...');
            rl.close();
            process.exit(0);
        case '3':
            showInitialMenu(initializeClient, checkLoginStatus, clearSession);
            break;
        default:
            console.log('Invalid option. Please try again.');
            showNoSessionMenu(initializeClient, clearSession);
    }
}

async function showMainMenu(initializeClient, clearSession) {
    console.log('\nWhatsApp Bot Main Menu:');
    console.log('1. Resume Session');
    console.log('2. Logout');
    console.log('3. Add Admin');
    console.log('4. Exit');
    rl.question('Choose an option: ', (choice) => handleMainChoice(choice, initializeClient, clearSession));
}

async function handleMainChoice(choice, initializeClient, clearSession) {
    switch (choice) {
        case '1':
            console.log('Resuming session...');
            await initializeClient();
            break;
        case '2':
            console.log('Logging out...');
            await clearSession();
            showInitialMenu(initializeClient, checkLoginStatus, clearSession);
            break;
        case '3':
            await promptAdminNumber();
            break;
        case '4':
            console.log('Exiting...');
            rl.close();
            process.exit(0);
        default:
            console.log('Invalid option. Please try again.');
            showMainMenu(initializeClient, clearSession);
    }
}

async function promptAdminNumber() {
    return new Promise((resolve) => {
        rl.question('Enter the admin phone number (with country code, no spaces or symbols): ', (number) => {
            console.log(`Admin number set to: ${number}`);
            resolve(number);
        });
    });
}

module.exports = {
    showInitialMenu,
    promptAdminNumber
};