const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('calculateshards')
    .setDescription('Calculates the Number of Spirit Shards Needed to Upgrade your Hero'),
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    // We need the client ID for the routes
    const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString('ascii');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
