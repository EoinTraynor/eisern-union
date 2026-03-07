// src/notifier.ts
export async function sendTelegramNotification(message: string) {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.error("⚠️ Telegram configuration missing in .env");
        return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });
        console.log("📱 Telegram notification sent!");
    } catch (error) {
        console.error("❌ Failed to send Telegram message:", error);
    }
}
