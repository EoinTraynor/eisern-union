/* eslint-disable no-console */
import { sendTelegramNotification } from './notifier';

async function test() {
  console.log('📡 Sending test notification to Telegram...');

  await sendTelegramNotification(
    `🧪 *Eisern Bot: Test Notification*\n` +
      `✅ Your bot is successfully connected!\n` +
      `🕒 Time: ${new Date().toLocaleTimeString()}\n` +
      `💪 Ready for the next match drop.`
  );

  console.log('🏁 Test script finished.');
}

test().catch(console.error);
