const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');
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
let ticketCount = 0; 
let targetCategoryId = null; // Stores your chosen category ID

// Cooldown Map (Stores user ID and expiration timestamp)
const ticketCooldowns = new Map();

client.on('ready', () => {
    console.log(`${client.user.tag} is online and fully configured!`);
    client.user.setActivity('Managing Tickets', { type: 3 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split('|'); 
    const commandWithArgs = args[0].trim().split(/ +/);
    const command = commandWithArgs.shift().toLowerCase();

    // 1. MAIN TICKET PANEL SETUP COMMAND
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

        menuOptions.push({
            label: cat1_label,
            emoji: cat1_emoji,
            description: `Open a ticket regarding ${cat1_label}`,
            value: `custom_cat_1_${cat1_label.toLowerCase().replace(/ /g, '_')}`
        });

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

    // 2. CONFIGURATION COMMAND: SET CATEGORY VIA GUI DROPDOWN
    if (command === 'set-ticket-category') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ You do not have permission to execute this command!");
        }

        // Fetch all categories from the current server
        const categories = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);

        if (categories.size === 0) {
            return message.reply("❌ There are no server category channels available in this server!");
        }

        const configEmbed = new EmbedBuilder()
            .setTitle('⚙️ Ticket Category Configuration')
            .setDescription('Please select the specific target server category panel from the dropdown menu below. All newly created tickets will automatically generate underneath it.')
            .setColor('#3498db');

        const categoryOptions = categories.map(cat => ({
            label: cat.name,
            description: `ID: ${cat.id}`,
            value: `set_target_cat_${cat.id}`
        })).slice(0, 25); // Discord select menus support up to 25 items maximum

        const configMenu = new StringSelectMenuBuilder()
            .setCustomId('config_category_menu')
            .setPlaceholder('Select a destination category folder...')
            .addOptions(categoryOptions);

        const configRow = new ActionRowBuilder().addComponents(configMenu);

        await message.channel.send({ embeds: [configEmbed], components: [configRow] });
    }
});

// COMPONENT INTERACTIONS LOGIC
client.on('interactionCreate', async (interaction) => {
    
    // HANDLING THE CATEGORY CONFIGURATION MENU
    if (interaction.isStringSelectMenu() && interaction.customId === 'config_category_menu') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ You don't have access to update settings.", ephemeral: true });
        }

        const selectedCatId = interaction.values[0].replace('set_target_cat_', '');
        targetCategoryId = selectedCatId; // Saved in memory

        const targetChannel = interaction.guild.channels.cache.get(selectedCatId);
        
        await interaction.reply({ 
            content: `✅ **Success!** Target ticket destination has been successfully locked onto: **${targetChannel ? targetChannel.name : selectedCatId}**`, 
            ephemeral: false 
        });
    }

    // HANDLING USER TICKET CREATION DROPDOWN
    if (interaction.isStringSelectMenu() && interaction.customId === 'prefix_ticket_menu') {
        const userId = interaction.user.id;

        // 1-Minute Anti-Spam Rate Limit Cooldown Validation
        if (ticketCooldowns.has(userId)) {
            const expirationTime = ticketCooldowns.get(userId);
            const currentTime = Date.now();

            if (currentTime < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - currentTime) / 1000);
                return interaction.reply({ 
                    content: `⏳ **Rate Limit Active!** Please wait **${timeLeft} seconds** before creating another support ticket instance.`, 
                    ephemeral: true 
                });
            }
        }

        const selectedValue = interaction.values[0];
        const cleanCategoryName = selectedValue.split('_').slice(3).join('-'); 
        const emojiUsed = interaction.component.options.find(o => o.value === selectedValue).emoji?.name || '📩';

        // Check for existing open channels
        const existingChannel = interaction.guild.channels.cache.find(c => c.name.includes(cleanCategoryName) && c.name.includes(String(ticketCount)));
        
        await interaction.deferReply({ ephemeral: true });

        // Format formatting tracker index increment
        ticketCount++;
        const paddedCount = String(ticketCount).padStart(4, '0');
        
        // Output channel pattern target: 📄-support-0001
        const channelName = `${emojiUsed}-${cleanCategoryName}-${paddedCount}`;

        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: targetCategoryId, // Places it inside your saved category GUI option
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

            // Send clean welcome notification message pinging the support team role ID explicitly
            await ticketChannel.send({ 
                content: `<@&1504851460502978696> Welcome ${interaction.user} to their support room.`, 
                embeds: [ticketEmbed], 
                components: [closeButton] 
            });

            // Set a strict 1-minute expiration timeline block parameter
            ticketCooldowns.set(userId, Date.now() + 60000);

            await interaction.editReply({ content: `✅ Your ticket channel has been created successfully: ${ticketChannel}` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Critical system error: Failed to safely initiate a channel.` });
        }
    }

    // HANDLING TICKET CHANNEL CLOSE ACTIONS
    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        await interaction.reply('🔒 This support instance is closing. Channel deletion will occur within **5 seconds**...');
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(process.env.TOKEN);
