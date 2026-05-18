const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const express = require('express');

// 24/7 Server Setup (UptimeRobot ke liye)
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

const PREFIX = '!'; // Bot ka prefix

client.on('ready', () => {
    console.log(`${client.user.tag} online hai!`);
    client.user.setActivity('Managing Server', { type: 3 }); // Status
});

// 1. WELCOME MESSAGE & AUTO-ROLE SYSTEM
client.on('guildMemberAdd', async (member) => {
    // Apne server me 'welcome' naam ka channel bana lena
    const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome');
    if (channel) {
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`Welcome to ${member.guild.name}!`)
            .setDescription(`Hello ${member}, hamare server me aapka swagat hai! Unique ID: ${member.id}`)
            .setColor('#00FF00')
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        channel.send({ embeds: [welcomeEmbed] });
    }

    // Auto Role: Server me 'Member' naam ka role bana lena, ye auto de dega
    const autoRole = member.guild.roles.cache.find(role => role.name === 'Member');
    if (autoRole) member.roles.add(autoRole).catch(console.error);
});

// COMMANDS & AUTOMOD
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 2. AUTOMOD SYSTEM (Anti-Bad Words)
    const badWords = ['scam', 'hack', 'bkl', 'mc']; // Jo words block karne hain yahan likho
    if (badWords.some(word => message.content.toLowerCase().includes(word))) {
        message.delete().catch(() => {});
        return message.channel.send(`${message.author}, Please server me galat words use mat karo!`)
            .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 3. TICKET SETUP COMMAND
    if (command === 'setup-ticket') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Aapke paas permission nahi hai.");

        const embed = new EmbedBuilder()
            .setTitle('Support Ticket')
            .setDescription('Agar aapko koi help chahiye ya staff se baat karni hai, to neeche diye gaye button par click karke Ticket open karein.')
            .setColor('#0099ff');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('📩 Open Ticket')
                .setStyle(ButtonStyle.Primary)
        );

        message.channel.send({ embeds: [embed], components: [row] });
    }

    // 4. SELF ROLES SETUP COMMAND
    if (command === 'setup-roles') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Permission nahi hai.");

        const embed = new EmbedBuilder()
            .setTitle('Get Your Roles')
            .setDescription('Neeche diye gaye buttons par click karke apne roles lein.')
            .setColor('#ffaa00');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('role_announcement').setLabel('📢 Updates Role').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('role_giveaway').setLabel('🎉 Giveaway Role').setStyle(ButtonStyle.Danger)
        );

        message.channel.send({ embeds: [embed], components: [row] });
    }
});

// INTERACTION HANDLING (Buttons Work)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // Ticket Create Logic
    if (interaction.customId === 'create_ticket') {
        const channelName = `ticket-${interaction.user.username.toLowerCase()}`;
        
        const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName);
        if (existingChannel) return interaction.reply({ content: `Aapka ticket pehle se khula hai: ${existingChannel}`, ephemeral: true });

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: 0, // GuildText
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle('Ticket Created!')
            .setDescription(`Hello ${interaction.user}, Staff jaldi hi aapki help karega. Ticket close karne ke liye neeche click karein.`)
            .setColor('#00ff00');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `Aapka ticket ban gaya hai: ${ticketChannel}`, ephemeral: true });
    }

    // Ticket Close Logic
    if (interaction.customId === 'close_ticket') {
        await interaction.reply('Yeh ticket 5 seconds me delete ho jayega...');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    // Self Roles Logic
    if (interaction.customId === 'role_announcement' || interaction.customId === 'role_giveaway') {
        const roleName = interaction.customId === 'role_announcement' ? 'Updates' : 'Giveaway';
        // Server me 'Updates' aur 'Giveaway' naam ke roles bana lena pehle
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);

        if (!role) return interaction.reply({ content: `Server me **${roleName}** naam ka role nahi mila! Pehle role banayein.`, ephemeral: true });

        if (interaction.member.roles.cache.has(role.id)) {
            await interaction.member.roles.remove(role);
            await interaction.reply({ content: `Aapse **${roleName}** role hata diya gaya hai.`, ephemeral: true });
        } else {
            await interaction.member.roles.add(role);
            await interaction.reply({ content: `Aapko **${roleName}** role de diya gaya hai!`, ephemeral: true });
        }
    }
});

// Render ke Environment Variables se TOKEN uthayega
client.login(process.env.TOKEN);
