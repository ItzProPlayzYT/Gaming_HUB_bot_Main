const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder 
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = 'YOUR_BOT_TOKEN_HERE'; // Yahan apna token dalein

client.once('ready', () => {
    console.log(`Bot is logged in as ${client.user.tag}!`);
    // NOTE: Slash commands ko register karna na bhulein (ya command register script chalayein)
});

client.on('interactionCreate', async interaction => {
    
    // 1. COMMAND: /ticket-setup
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ticket-setup') {
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_title').setLabel('Title').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_desc').setLabel('Description').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_color').setLabel('Color').setStyle(ButtonStyle.Primary)
            );
            
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_save').setLabel('Save & Set Category').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_exit').setLabel('Exit').setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({ 
                content: 'Setup your ticket system below:', 
                components: [row1, row2], 
                ephemeral: true 
            });
        }
    }

    // 2. BUTTONS: Click hone par Modal khulega
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_title') {
            const modal = new ModalBuilder().setCustomId('modal_title').setTitle('Set Ticket Title');
            const input = new TextInputBuilder().setCustomId('input_title').setLabel('Title').setStyle(TextInputStyle.Short);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
        
        if (interaction.customId === 'btn_exit') {
            await interaction.update({ content: 'Setup cancelled.', components: [] });
        }
        // Baaki buttons (desc, color, save) ka logic yahan add karein
    }

    // 3. MODAL: Input save karna
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_title') {
            const val = interaction.fields.getTextInputValue('input_title');
            await interaction.reply({ content: `Title saved as: **${val}**`, ephemeral: true });
        }
    }
});

client.login(TOKEN);

