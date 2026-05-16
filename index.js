const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// ==================== 1. RENDER 24/7 SERVER ====================
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot Status: 24/7 Online via Render!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// ==================== 2. DISCORD BOT CODE ====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Bot is ready.`);
});

// Simple commands: !ping aur !hello
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!ping') {
        message.reply(`🏓 Pong! Bot ekdum sahi chal raha hai.`);
    }
    if (message.content.toLowerCase() === '!hello') {
        message.reply(`Hey ${message.author.username}! Welcome to our server! 🔥`);
    }
});

// Token Render se automatic uthayega
client.login(process.env.DISCORD_TOKEN);
