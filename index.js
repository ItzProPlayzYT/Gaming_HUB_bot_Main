const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');
const express = require('express');

// 24/7 Uptime Web Server
const app = express();
app.get('/', (req, res) => res.send('Ticket Bot is active 24/7!'));
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
let ticketCount = 0; 
let targetCategoryId = null; // Stores selected category ID in memory

// Map tracking user rate limits
const ticketCooldowns = new Map();

client.on('ready', () => {
    console.log(`[SYSTEM] ${client.user.tag} is online. Only Ticket Management modules are loaded.`);
    client.user.setActivity('Managing Tickets', { type: 3 });
});

// TEXT PREFIX COMMANDS
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split('|'); 
    const commandWithArgs = args[0].trim().split(/ +/);
    const command = commandWithArgs.shift().toLowerCase();

    // 1. TICKET PANEL GENERATION SETUP COMMAND
    if (command === 'ticket-setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ You do not have permission to execute this command!");
        }

        if (args.length < 5) {
            return message.reply(
                "❌ **Invalid Format!** Please use the following structure:\n\n" +
                "`!ticket-setup Title | Description | Color (#Hex) | Cat1_Label | Cat1_Emoji`"
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

        // Dynamic addition of Category 1
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

    // 2. GUI TARGET CONFIGURATION: !set-ticket-category
    if (command === 'set-ticket-category') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ You do not have permission to execute this command!");
        }

        const categories = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);

        if (categories.size === 0) {
            return message.reply("❌ There are no category folders found in this server!");
        }

        const configEmbed = new EmbedBuilder()
            .setTitle('⚙️ Ticket Target Folder Configuration')
            .setDescription('Select the target category folder from the selection menu below. All future open support rooms will nest underneath it.')
            .setColor('#3498db');

        const categoryOptions = categories.map(cat => ({
            label: cat.name,
            description: `ID: ${cat.id}`,
            value: `set_target_cat_${cat.id}`
        })).slice(0, 25); 

        const configMenu = new StringSelectMenuBuilder()
            .setCustomId('config_category_menu')
            .setPlaceholder('Choose a destination category...')
            .addOptions(categoryOptions);

        const configRow = new ActionRowBuilder().addComponents(configMenu);

        await message.channel.send({ embeds: [configEmbed], components: [configRow] });
    }
});

// SYSTEM GUI HANDLING INTERACTION INTERFACE
client.on('interactionCreate', async (interaction) => {
    
    // ACTION A: LOCK TARGET CATEGORY CHOICE
    if (interaction.isStringSelectMenu() && interaction.customId === 'config_category_menu') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ You don't have access to update global system configurations.", ephemeral: true });
        }

        const selectedCatId = interaction.values[0].replace('set_target_cat_', '');
        targetCategoryId = selectedCatId; 

        const targetChannel = interaction.guild.channels.cache.get(selectedCatId);
        
        await interaction.reply({ 
            content: `✅ **Configuration Applied!** All incoming support instances will now automatically target: **${targetChannel ? targetChannel.name : selectedCatId}**`, 
            ephemeral: false 
        });
    }

    // ACTION B: CREATE CHANNELS UPON USER DROPDOWN SELECTION
    if (interaction.isStringSelectMenu() && interaction.customId === 'prefix_ticket_menu') {
        const userId = interaction.user.id;

        // Anti-Spam Rate Limit Calculation Check (60 Seconds)
        if (ticketCooldowns.has(userId)) {
            const expirationTime = ticketCooldowns.get(userId);
            const currentTime = Date.now();

            if (currentTime < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - currentTime) / 1000);
                return interaction.reply({ 
                    content: `⏳ **Anti-Spam Filter:** Please wait **${timeLeft} seconds** before spawning another help thread instance inside the guild.`, 
                    ephemeral: true 
                });
            }
        }

        const selectedValue = interaction.values[0];
        const cleanCategoryName = selectedValue.split('_').slice(3).join('-'); 
        const emojiUsed = interaction.component.options.find(o => o.value === selectedValue).emoji?.name || '📩';

        await interaction.deferReply({ ephemeral: true });

        // Update sequential ticker formatting index values
        ticketCount++;
        const paddedCount = String(ticketCount).padStart(4, '0');
        
        // Output channel structure scheme format: 📄-support-0001
        const channelName = `${emojiUsed}-${cleanCategoryName}-${paddedCount}`;

        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: targetCategoryId, // Places room right under your custom GUI selected folder
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

            // Cleared all custom username headers. Pings your exact Support Staff Team via Role ID outside the text layout block.
            await ticketChannel.send({ 
                content: `<@&1504851460502978696> Welcome ${interaction.user} to their support room.`, 
                embeds: [ticketEmbed], 
                components: [closeButton] 
            });

            // Log rate limit timestamp expiration lock
            ticketCooldowns.set(userId, Date.now() + 60000);

            await interaction.editReply({ content: `✅ Your ticket channel has been created successfully: ${ticketChannel}` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Critical system error: Failed to safely initiate a channel.` });
        }
    }

    // ACTION C: DISMISS CHANNEL VIA INTERACTION BUTTON
    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        await interaction.reply('🔒 This support instance is closing. Channel deletion will occur within **5 seconds**...');
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(process.env.TOKEN);
