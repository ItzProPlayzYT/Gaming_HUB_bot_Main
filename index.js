const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot 24/7 Active Hai!'));
app.listen(3000, () => console.log('Web Server Ready!'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Bot Prefix
const PREFIX = '!'; 

client.on('ready', () => {
    console.log(`${client.user.tag} online hai aur !ticket-setup ke liye taiyar hai!`);
    client.user.setActivity('!ticket-setup', { type: 3 });
});

// PREFIX COMMAND HANDLING
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split('|'); // Hum '|' use karenge parts ko alag karne ke liye
    const commandWithArgs = args[0].trim().split(/ +/);
    const command = commandWithArgs.shift().toLowerCase();

    // COMMAND: !ticket-setup
    if (command === 'ticket-setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("Aapke paas permission nahi hai!");
        }

        /* Kaise chalana hai? Format:
        !ticket-setup Title | Description | Color (#hex) | Cat1_Label | Cat1_Emoji | Cat2_Label | Cat2_Emoji
        */

        if (args.length < 5) {
            return message.reply(
                "❌ **Galat Format!** Sahil tarika niche dekho:\n\n" +
                "`!ticket-setup Title | Description | Color (#Hex) | Cat1_Label | Cat1_Emoji`\n\n" +
                "**Example:**\n" +
                "`!ticket-setup Support Hub | Open a ticket below \\n Support 24/7 | #ffaa00 | Design Service | 🎨 | Setup Support | 🛠️`"
            );
        }

        const title = args[0].replace('ticket-setup', '').trim();
        const description = args[1].trim().replace(/\\n/g, '\n');
        const color = args[2].trim() || '#2f3136';
        
        const cat1_label = args[3].trim();
        const cat1_emoji = args[4].trim();

        // Base Embed
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color.startsWith('#') ? color : `#${color}`)
            .setTimestamp();

        const menuOptions = [];

        // Category 1
        menuOptions.push({
            label: cat1_label,
            emoji: cat1_emoji,
            description: `Open a ticket for ${cat1_label}`,
            value: `custom_cat_1_${cat1_label.toLowerCase().replace(/ /g, '_')}`
        });

        // Optional Category 2 (Agar aapne add ki ho argument me)
        if (args[5] && args[6]) {
            const cat2_label = args[5].trim();
            const cat2_emoji = args[6].trim();
            menuOptions.push({
                label: cat2_label,
                emoji: cat2_emoji,
                description: `Open a ticket for ${cat2_label}`,
                value: `custom_cat_2_${cat2_label.toLowerCase().replace(/ /g, '_')}`
            });
        }

        // Optional Category 3
        if (args[7] && args[8]) {
            const cat3_label = args[7].trim();
            const cat3_emoji = args[8].trim();
            menuOptions.push({
                label: cat3_label,
                emoji: cat3_emoji,
                description: `Open a ticket for ${cat3_label}`,
                value: `custom_cat_3_${cat3_label.toLowerCase().replace(/ /g, '_')}`
            });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId('prefix_ticket_menu')
            .setPlaceholder('👉 Select a category to open a ticket...')
            .addOptions(menuOptions);

        const row = new ActionRowBuilder().addComponents(menu);

        await message.channel.send({ embeds: [embed], components: [row] });
        message.delete().catch(() => {}); // Purana trigger message delete kar dega
    }
});

// TICKET OPEN & CLOSE INTERACTIONS
client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'prefix_ticket_menu') {
        const selectedValue = interaction.values[0];
        const cleanCategoryName = selectedValue.split('_').slice(3).join('-'); 
        const emojiUsed = interaction.component.options.find(o => o.value === selectedValue).emoji?.name || '📩';

        const channelName = `${emojiUsed}-${cleanCategoryName}-${interaction.user.username.toLowerCase()}`.replace(/ /g, '-');

        const existingChannel = interaction.guild.channels.cache.find(c => c.name.includes(interaction.user.username.toLowerCase()));
        if (existingChannel) {
            return interaction.reply({ content: `❌ Ticket pehle se khula hai!`, ephemeral: true });
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: 0,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
            ]
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle(`Ticket Opened!`)
            .setDescription(`Hello ${interaction.user},\nSupport team jaldi respond karegi. Apni details share karein.`)
            .setColor('#2ecc71');

        const closeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [closeButton] });
        await interaction.reply({ content: `✅ Ticket bana diya: ${ticketChannel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        await interaction.reply('🔒 Deleting channel in 5s...');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

client.login(process.env.TOKEN);
