const fs = require('fs').promises;
const path = require('path');

async function deleteFile(filePath, maxAttempts = 5) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await fs.unlink(filePath);
            console.log(`Successfully deleted: ${filePath}`);
            return;
        } catch (error) {
            console.error(`Attempt ${attempt} failed to delete ${filePath}: ${error.message}`);
            if (attempt === maxAttempts) {
                console.error(`Failed to delete ${filePath} after ${maxAttempts} attempts`);
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before next attempt
            }
        }
    }
}

async function deleteDirectory(dir) {
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.lstat(filePath);
            if (stats.isDirectory()) {
                await deleteDirectory(filePath);
            } else {
                await deleteFile(filePath);
            }
        }
        await fs.rmdir(dir);
        console.log(`Successfully deleted directory: ${dir}`);
    } catch (error) {
        console.error(`Error deleting directory ${dir}:`, error);
    }
}

async function clearSession() {
    console.log('Attempting to clean up session files...');
    const sessionDir = path.join(process.cwd(), '.wwebjs_auth', 'session');
    await deleteDirectory(sessionDir);
    console.log('Session cleanup completed.');
}

module.exports = { clearSession };