import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    Interaction,
    GuildMember,
    PermissionsBitField
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { TOKEN, ADMIN, SUPPORT, GUILD_ID } = process.env;

if (!TOKEN || !ADMIN || !SUPPORT || !GUILD_ID) {
    throw new Error('Missing required environment variables: TOKEN, ADMIN, SUPPORT, or GUILD_ID');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'db.json');

interface DB {
    allowed_roles: string[];
}

function loadDB(): DB {
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(raw);
    } catch {
        return { allowed_roles: [] };
    }
}

function saveDB(db: DB) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

let db = loadDB();
const ALLOWED_ROLES = new Set<string>(db.allowed_roles);

const commands = [
    new SlashCommandBuilder()
        .setName('grant')
        .setDescription('Grant an allowed role to a user')
        .addUserOption(opt =>
            opt
                .setName('user')
                .setDescription('User to grant the role')
                .setRequired(true),
        )
        .addRoleOption(opt =>
            opt
                .setName('role')
                .setDescription('Role to grant')
                .setRequired(true),
        ),

    new SlashCommandBuilder()
        .setName('ungrant')
        .setDescription('Remove a granted role from a user')
        .addUserOption(opt =>
            opt
                .setName('user')
                .setDescription('User to remove the role from')
                .setRequired(true),
        )
        .addRoleOption(opt =>
            opt
                .setName('role')
                .setDescription('Role to remove')
                .setRequired(true),
        ),

    new SlashCommandBuilder()
        .setName('roles')
        .setDescription('List all allowed roles'),

    new SlashCommandBuilder()
        .setName('add')
        .setDescription('Admin: Allow a role to be grantable')
        .addRoleOption(opt =>
            opt
                .setName('role')
                .setDescription('Role to allow')
                .setRequired(true),
        ),

    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Admin: Disallow a role from being granted')
        .addRoleOption(opt =>
            opt
                .setName('role')
                .setDescription('Role to disallow')
                .setRequired(true),
        ),
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user!.tag}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const appId = client.user!.id;

    try {
        await rest.put(
            Routes.applicationGuildCommands(appId, GUILD_ID),
            { body: commands }
        );
        console.log(`Registered slash commands to guild ${GUILD_ID}`);
    } catch (err) {
        console.error('Failed to register commands:', err);
    }
});

client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const member = interaction.member as GuildMember;
    const perms = member.permissions as PermissionsBitField;

    const isAdmin =
        member.roles.cache.has(ADMIN) ||
        perms.has(PermissionsBitField.Flags.Administrator);

    const isSupport =
        member.roles.cache.has(SUPPORT) ||
        perms.has(PermissionsBitField.Flags.Administrator);

    const cmd = interaction.commandName;

    if (cmd === 'grant' || cmd === 'ungrant') {
        if (!isSupport && !isAdmin) {
            return interaction.reply({ content: 'Access denied', ephemeral: true });
        }

        const user = interaction.options.getUser('user', true);
        const roleOption = interaction.options.getRole('role', true);
        const roleId = roleOption.id;

        if (!ALLOWED_ROLES.has(roleId)) {
            return interaction.reply({ content: 'Role not allowed', ephemeral: true });
        }

        const guild = interaction.guild!;
        const targetMember = await guild.members.fetch(user.id);

        if (cmd === 'grant') {
            await targetMember.roles.add(roleId);

            return interaction.reply({
                content: `Granted <@&${roleId}> to ${user}`,
                ephemeral: true
            });
        } else {
            await targetMember.roles.remove(roleId);

            return interaction.reply({
                content: `Removed <@&${roleId}> from ${user}`,
                ephemeral: true
            });
        }
    }

    if (cmd === 'roles') {
        const list = [...ALLOWED_ROLES]
            .map(r => `<@&${r}>`)
            .join('\n') || '*No roles configured*';

        return interaction.reply({
            content: `Allowed roles:\n${list}`,
            ephemeral: true
        });
    }

    if (cmd === 'add' || cmd === 'remove') {
        if (!isAdmin) {
            return interaction.reply({ content: 'Admin only', ephemeral: true });
        }

        const roleOption = interaction.options.getRole('role', true);
        const roleId = roleOption.id;

        if (cmd === 'add') {
            ALLOWED_ROLES.add(roleId);
            db.allowed_roles = [...ALLOWED_ROLES];
            saveDB(db);

            return interaction.reply({
                content: `Added <@&${roleId}> to allowed roles`,
                ephemeral: true
            });
        } else {
            ALLOWED_ROLES.delete(roleId);
            db.allowed_roles = [...ALLOWED_ROLES];
            saveDB(db);

            return interaction.reply({
                content: `Removed <@&${roleId}> from allowed roles`,
                ephemeral: true
            });
        }
    }
});

client.login(TOKEN);
