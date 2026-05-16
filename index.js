const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot Status: 24/7 Online!');
});

// Yeh line Render ke Singapore server ke liye fix hai
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});

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

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!ping') {
        message.reply(`🏓 Pong! Bot ekdum sahi chal raha hai.`);
    }
    if (message.content.toLowerCase() === '!hello') {
        message.reply(`Hey ${message.author.username}! Welcome! 🔥`);
    }
});

client.login(process.env.DISCORD_TOKEN);

