const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is active 24/7!'));
app.listen(3000, () => console.log('Web Server Ready!'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '!'; 
let ticketCount = 0; // Local counter that starts from 0

client.on('ready', () => {
    console.log(`${client.user.tag} is online and ready for !ticket-setup!`);
    client.user.setActivity('!ticket-setup', { type: 3 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split('|'); 
    const commandWithArgs = args[0].trim().split(/ +/);
    const command = commandWithArgs.shift().toLowerCase();

    if (command === 'ticket-setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ You do not have permission to execute this command!");
        }

        if (args.length < 5) {
            return message.reply(
                "❌ **Invalid Format!** Please use the following structure:\n\n" +
                "`!ticket-setup Title | Description | Color (#Hex) | Cat1_Label | Cat1_Emoji`\n\n" +
                "**Example:**\n" +
                "`!ticket-setup Support Hub | Open a ticket below \\n Available 24/7 | #ffaa00 | Support | 📄 | Development | 🛠️`"
            );
        }

        const title = args[0].replace('ticket-setup', '').trim();
        const description = args[1].trim().replace(/\\n/g, '\n');
        const color = args[2].trim() || '#2f3136';
        
        const cat1_label = args[3].trim();
        const cat1_emoji = args[4].trim();

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
            description: `Open a ticket regarding ${cat1_label}`,
            value: `custom_cat_1_${cat1_label.toLowerCase().replace(/ /g, '_')}`
        });

        // Optional Category 2
        if (args[5] && args[6]) {
            const cat2_label = args[5].trim();
            const cat2_emoji = args[6].trim();
            menuOptions.push({
                label: cat2_label,
                emoji: cat2_emoji,
                description: `Open a ticket regarding ${cat2_label}`,
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
                description: `Open a ticket regarding ${cat3_label}`,
                value: `custom_cat_3_${cat3_label.toLowerCase().replace(/ /g, '_')}`
            });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId('prefix_ticket_menu')
            .setPlaceholder('👉 Select a category to open a ticket...')
            .addOptions(menuOptions);

        const row = new ActionRowBuilder().addComponents(menu);

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {}); 
    }
});

// INTERACTION COMPONENT HANDLER
client.on('interactionCreate', async (interaction) => {
    // 1. Dropdown Selection Logic
    if (interaction.isStringSelectMenu() && interaction.customId === 'prefix_ticket_menu') {
        const selectedValue = interaction.values[0];
        const cleanCategoryName = selectedValue.split('_').slice(3).join('-'); 
        const emojiUsed = interaction.component.options.find(o => o.value === selectedValue).emoji?.name || '📩';
        const usernameClean = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Checking for an existing open ticket channel for the user
        const existingChannel = interaction.guild.channels.cache.find(c => c.name.includes(usernameClean) && c.type === 0);
        if (existingChannel) {
            return interaction.reply({ content: `❌ You already have an open ticket channel: ${existingChannel}`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        // Automated Parent Category System
        let parentCategory = interaction.guild.channels.cache.find(c => c.name.toUpperCase() === 'TICKETS' && c.type === 4);
        if (!parentCategory) {
            try {
                parentCategory = await interaction.guild.channels.create({
                    name: 'TICKETS',
                    type: 4 // Category type
                });
            } catch (err) {
                console.error("Failed to automatically build TICKETS category:", err);
            }
        }

        // Generating a sequential 4-digit ID ticker number (0001, 0002, etc.)
        ticketCount++;
        const paddedCount = String(ticketCount).padStart(4, '0');
        const channelName = `${emojiUsed}-${cleanCategoryName}-${usernameClean}-${paddedCount}`;

        try {
            // Generating locked channel under the 'TICKETS' Category parent folder
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: 0, // Text Channel
                parent: parentCategory ? parentCategory.id : null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
                ]
            });

            const ticketEmbed = new EmbedBuilder()
                .setTitle(`🎟️ Ticket Created - System Logs`)
                .setDescription(
                    `Hello ${interaction.user},\n\nThank you for reaching out to support. Our team will review your inquiry shortly. In the meantime, please supply all necessary information regarding your request.\n\n` +
                    `• **Selected Department:** ${cleanCategoryName.toUpperCase()}\n` +
                    `• **Ticket ID Reference:** #${paddedCount}`
                )
                .setColor('#2ecc71')
                .setFooter({ text: 'Use the button below to close this instance.' });

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket_btn')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await ticketChannel.send({ content: `${interaction.user} Welcome to your support request room.`, embeds: [ticketEmbed], components: [closeButton] });
            await interaction.editReply({ content: `✅ Your ticket channel has been created successfully: ${ticketChannel}` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Critical system error: Failed to safely initiate a channel.` });
        }
    }

    // 2. Close Button Logic
    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        await interaction.reply('🔒 This support instance is closing. Channel deletion will occur within **5 seconds**...');
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(process.env.TOKEN);
