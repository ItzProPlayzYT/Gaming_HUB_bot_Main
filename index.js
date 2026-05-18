const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');

// 24/7 Server Setup
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

// SLASH COMMAND REGISTER LOGIC
client.on('ready', async () => {
    console.log(`${client.user.tag} online hai!`);
    client.user.setActivity('Managing Tickets', { type: 3 });

    // Defining /ticket setup command
    const commands = [
        new SlashCommandBuilder()
            .setName('ticket')
            .setDescription('Ticket system setup karne ke liye')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('setup')
                    .setDescription('Professional Dropdown Ticket Message bhejein')
            )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Slash commands ko register kiya ja raha hai...');
        // Yeh globally saare servers me slash command register kar dega
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Slash commands successfully register ho gayi!');
    } catch (error) {
        console.error(error);
    }
});

// HANDLING SLASH COMMANDS
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'ticket') {
        const subcommand = options.getSubcommand();

        if (subcommand === 'setup') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: "Aapke paas ye command chalane ki permission nahi hai!", ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('📩 Open a Support Ticket')
                .setDescription(
                    `🛠️ **Pre-Made Setups & Resources**\n` +
                    `• Minecraft Setups, Discord Templates, Packs\n\n` +
                    `🎨 **Design Services**\n` +
                    `• Logos, UI Design, Thumbnails, Banners\n\n` +
                    `🛒 **Custom Requests**\n` +
                    `• Something unique in mind? We'll craft it.\n\n` +
                    `🌴 *Response Time: 1-12 hours*\n` +
                    `🌴 *Do Not Mention Staff after opening*`
                )
                .setColor('#f1c40f')
                .setTimestamp();

            const menu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select_menu')
                .setPlaceholder('👉 Select a category to open a ticket...')
                .addOptions([
                    {
                        label: 'Pre-Made Setups',
                        description: 'Minecraft & Discord templates, setup files',
                        value: 'setup_category',
                        emoji: '🛠️'
                    },
                    {
                        label: 'Design Services',
                        description: 'Logos, UI Design, Thumbnails, Banners',
                        value: 'design_category',
                        emoji: '🎨'
                    },
                    {
                        label: 'Custom Requests',
                        description: 'Craft something unique from scratch',
                        value: 'custom_category',
                        emoji: '🛒'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(menu);

            // Send ticket embed to the channel
            await interaction.channel.send({ embeds: [embed], components: [row] });
            
            // Interaction ka reply dena compulsory hota hai, isliye ye staff ko hi dikhega bas
            await interaction.reply({ content: '✅ Ticket system successfully setup ho gaya!', ephemeral: true });
        }
    }
});

// DROPDOWN TICKET HANDLER & CLOSE BUTTON
client.on('interactionCreate', async (interaction) => {
    // 1. Dropdown Logic
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
        const selection = interaction.values[0];
        let categoryName = '';
        let staffRoleName = '';

        if (selection === 'setup_category') {
            categoryName = '🛠️-setup';
            staffRoleName = 'Setup Staff';
        } else if (selection === 'design_category') {
            categoryName = '🎨-design';
            staffRoleName = 'Design Staff';
        } else if (selection === 'custom_category') {
            categoryName = '🛒-custom';
            staffRoleName = 'Admin';
        }

        const channelName = `${categoryName}-${interaction.user.username.toLowerCase()}`;
        
        const existingChannel = interaction.guild.channels.cache.find(c => c.name.includes(interaction.user.username.toLowerCase()));
        if (existingChannel) {
            return interaction.reply({ content: `❌ Aapka ek ticket pehle se hi khula hai: ${existingChannel}`, ephemeral: true });
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
            .setTitle(`Ticket Opened - ${interaction.user.username}`)
            .setDescription(`Hello ${interaction.user},\nSupport team jaldi hi aapki help karega. Tab tak aap apni details share kar sakte hain.\n\n**Category:** ${selection.replace('_', ' ').toUpperCase()}`)
            .setColor('#2ecc71')
            .setTimestamp();

        const closeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket_btn')
                .setLabel('🔒 Close Ticket')
                .setStyle(ButtonStyle.Danger)
        );

        const staffRole = interaction.guild.roles.cache.find(r => r.name === staffRoleName);
        const mentionContent = staffRole ? `${interaction.user} ne ticket khola hai! Ping: ${staffRole}` : `${interaction.user} ne ticket khola hai!`;

        await ticketChannel.send({ content: mentionContent, embeds: [ticketEmbed], components: [closeButton] });
        await interaction.reply({ content: `✅ Aapka ticket ban gaya hai: ${ticketChannel}`, ephemeral: true });
    }

    // 2. Button Close Logic
    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        await interaction.reply('🔒 Yeh ticket channel **5 seconds** me delete ho jayega...');
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(process.env.TOKEN);
