const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is Online!'));
app.listen(port, () => console.log(`Web server running on port ${port}`));

const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder 
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = 'APNA_TOKEN_YAHAN_DAALEIN'; // Token sahi daalein

client.once('ready', () => {
    console.log(`Bot is logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    
    // Command Handle
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ticket-setup') {
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_title').setLabel('Title').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_desc').setLabel('Description').setStyle(ButtonStyle.Primary)
            );
            
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_save').setLabel('Save & Set Category').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_exit').setLabel('Exit').setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({ 
                content: 'Ticket Setup Menu:', 
                components: [row1, row2], 
                ephemeral: true 
            });
        }
    }

    // Buttons Handle
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_title') {
            const modal = new ModalBuilder().setCustomId('modal_title').setTitle('Set Ticket Title');
            const input = new TextInputBuilder()
                .setCustomId('input_title')
                .setLabel('Enter Title')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
        
        if (interaction.customId === 'btn_exit') {
            await interaction.update({ content: 'Setup closed.', components: [] });
        }
    }

    // Modal Handle
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_title') {
            const val = interaction.fields.getTextInputValue('input_title');
            await interaction.reply({ content: `Title saved as: ${val}`, ephemeral: true });
        }
    }
});

client.login(TOKEN);
