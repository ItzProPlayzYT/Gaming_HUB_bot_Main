const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');
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

client.on('ready', async () => {
    console.log(`${client.user.tag} online hai!`);
    client.user.setActivity('Custom Tickets', { type: 3 });

    const commands = [
        new SlashCommandBuilder()
            .setName('ticket')
            .setDescription('Ticket system setup karne ke liye')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('setup')
                    .setDescription('Apna khud ka custom dropdown ticket message banayein')
                    .addStringOption(option => option.setName('title').setDescription('Embed message ka Title likhein').setRequired(true))
                    .addStringOption(option => option.setName('description').setDescription('Embed message ka poora Description dalein').setRequired(true))
                    .addStringOption(option => option.setName('embed_color').setDescription('Hex Color Code (e.g. #ff0000)').setRequired(false))
                    .addStringOption(option => option.setName('cat1_label').setDescription('Pehli category ka naam').setRequired(true))
                    .addStringOption(option => option.setName('cat1_emoji').setDescription('Pehli category ka emoji').setRequired(true))
                    .addStringOption(option => option.setName('cat1_desc').setDescription('Pehli category ka chhota description').setRequired(false))
                    .addStringOption(option => option.setName('cat2_label').setDescription('Dusri category ka naam').setRequired(false))
                    .addStringOption(option => option.setName('cat2_emoji').setDescription('Dusri category ka emoji').setRequired(false))
                    .addStringOption(option => option.setName('cat2_desc').setDescription('Dusri category ka chhota description').setRequired(false))
                    .addStringOption(option => option.setName('cat3_label').setDescription('Teesri category ka naam').setRequired(false))
                    .addStringOption(option => option.setName('cat3_emoji').setDescription('Teesri category ka emoji').setRequired(false))
                    .addStringOption(option => option.setName('cat3_desc').setDescription('Teesri category ka chhota description').setRequired(false))
            )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Refreshing slash commands...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Slash commands loaded successfully!');
    } catch (error) {
        console.error(error);
    }
});

// COMMAND INTERACTION HANDLER
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    if (commandName === 'ticket' && options.getSubcommand() === 'setup') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "Aapke paas permission nahi hai!", ephemeral: true });
        }

        const title = options.getString('title');
        const description = options.getString('description').replace(/\\n/g, '\n');
        const color = options.getString('embed_color') || '#2f3136';

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color.startsWith('#') ? color : `#${color}`)
            .setTimestamp();

        const menuOptions = [];

        menuOptions.push({
            label: options.getString('cat1_label'),
            emoji: options.getString('cat1_emoji'),
            description: options.getString('cat1_desc') || 'Open a ticket',
            value: `custom_cat_1_${options.getString('cat1_label').toLowerCase().replace(/ /g, '_')}`
        });

        if (options.getString('cat2_label')) {
            menuOptions.push({
                label: options.getString('cat2_label'),
                emoji: options.getString('cat2_emoji') || '📩',
                description: options.getString('cat2_desc') || 'Open a ticket',
                value: `custom_cat_2_${options.getString('cat2_label').toLowerCase().replace(/ /g, '_')}`
            });
        }

        if (options.getString('cat3_label')) {
            menuOptions.push({
                label: options.getString('cat3_label'),
                emoji: options.getString('cat3_emoji') || '📩',
                description: options.getString('cat3_desc') || 'Open a ticket',
                value: `custom_cat_3_${options.getString('cat3_label').toLowerCase().replace(/ /g, '_')}`
            });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId('dynamic_ticket_menu')
            .setPlaceholder('👉 Select a category to open a ticket...')
            .addOptions(menuOptions);

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Ticket system setup done!', ephemeral: true });
    }
});

// DROPDOWN AND BUTTON HANDLER
client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'dynamic_ticket_menu') {
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
            .setDescription(`Hello ${interaction.user},\nSupport team jaldi respond karegi.`)
            .setColor('#2ecc71');

        const closeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [closeButton] });
        await interaction.reply({ content: `✅ Ticket bana diya: ${ticketChannel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        await interaction.reply('🔒 Deleting channel in 5s...');
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(process.env.TOKEN);
