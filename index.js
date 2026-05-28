// 1. Web Server (Render ke liye)
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is Online!'));
app.listen(process.env.PORT || 3000);

// 2. Discord.js Setup
const { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, 
    TextInputBuilder, TextInputStyle 
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const TOKEN = 'YOUR_BOT_TOKEN_HERE';
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; // Bot ki ID

// 3. Command Register karna (Ready hote hi)
client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder()
            .setName('ticket-setup')
            .setDescription('Setup your ticket system')
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Successfully registered /ticket-setup command!');
    } catch (error) {
        console.error(error);
    }
    console.log(`Logged in as ${client.user.tag}!`);
});

// 4. Interaction Handling
client.on('interactionCreate', async interaction => {
    
    // Command Handle
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ticket-setup') {
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_title').setLabel('Title').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_desc').setLabel('Description').setStyle(ButtonStyle.Primary)
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_save').setLabel('Save').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_exit').setLabel('Exit').setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({ content: 'Ticket Setup Menu:', components: [row1, row2], ephemeral: true });
        }
    }

    // Buttons Handle
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_title') {
            const modal = new ModalBuilder().setCustomId('modal_title').setTitle('Set Ticket Title');
            const input = new TextInputBuilder().setCustomId('input_title').setLabel('Enter Title').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
        if (interaction.customId === 'btn_exit') {
            await interaction.update({ content: 'Setup cancelled.', components: [] });
        }
    }

    // Modal Handle
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_title') {
            const val = interaction.fields.getTextInputValue('input_title');
            await interaction.reply({ content: `Title saved: ${val}`, ephemeral: true });
        }
    }
});

client.login(TOKEN);
