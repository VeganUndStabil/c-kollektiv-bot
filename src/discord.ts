import {
  Client,
  OAuth2Scopes,
  SlashCommandBuilder,
  ChannelType,
  Guild,
  ChatInputCommandInteraction,
  ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle
} from "discord.js";
import { Configuration } from "src/entities/configuration";
import { sleep } from "src/util/sleep";

export const client = new Client({
  intents: [
    "Guilds",
  ],
});

async function getOrCreateCommand(
  guild: Guild,
  command: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
) {
  if (guild.commands.cache.find(it => it.name === command.name)) return;
  await guild.commands.create(command);
}


client.on("ready", async (client) => {
  const ids = [...client.guilds.cache.keys()].map(id => ({ id }));
  await Configuration.upsert(ids, {
    conflictPaths: ["id"],
  });
  for (const guild of client.guilds.cache.values()) {
    await getOrCreateCommand(guild, new SlashCommandBuilder()
      .setName("create-request-wizard-button")
      .setDescription("erstellt einen 'Auftrag erstellen' button")
      .setDMPermission(false)
      .setNSFW(false)
    );

    await getOrCreateCommand(guild, new SlashCommandBuilder()
      .setName("set-channels")
      .setDescription("legt kanäle fest")
      .setDMPermission(false)
      .setNSFW(false)
      .addChannelOption(option =>
        option
          .setName("request-channel")
          .setDescription("channel category where request channels are created")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildCategory)
      )
      .addChannelOption(option =>
        option
          .setName("cutting-channel")
          .setDescription("channel where cutters are notified of available requests")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addChannelOption(option =>
        option
          .setName("thumbnail-channel")
          .setDescription("channel where thumbnail creators are notified of available")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addChannelOption(option =>
        option
          .setName("archive-channel")
          .setDescription("channel category where finished or stale requests are moved to")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildCategory)
      )
    );
  }
});

const commandHandlers: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {};

commandHandlers["set-channels"] = async (interaction) => {
  const requestChannel = interaction.options.getChannel("request-channel", true);
  const cuttingChannel = interaction.options.getChannel("cutting-channel", true);
  const thumbnailChannel = interaction.options.getChannel("thumbnail-channel", true);
  const archiveChannel = interaction.options.getChannel("archive-channel", true);

  await Configuration.upsert({
    id: interaction.guildId!,
    archiveChannelId: archiveChannel.id,
    cuttingChannelId: cuttingChannel.id,
    requestChannelId: requestChannel.id,
    thumbnailChannelId: thumbnailChannel.id,
  }, ["id"])

  await interaction.reply({
    ephemeral: true,
    content: "Channel wurden festgelegt.",
  });
};

commandHandlers["create-request-wizard-button"] = async (interaction) => {
  const channel = interaction.channel!;
  channel.send({
    content: `schreib hier deinen tollen text rein :)`,
    components: [
      new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
          .setCustomId("request:create")
          .setLabel("Auftrag erstellen")
          .setStyle(ButtonStyle.Primary)
      )
    ]
  });
  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply();
};

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.isCommand()) {
    if (commandHandlers[interaction.commandName]) await commandHandlers[interaction.commandName](interaction);
  }
  if (!interaction.isButton()) return;
  const config = (await Configuration.findOne({ where: { id: interaction.guildId! } }))!;
  const [, step, ...args] = interaction.customId.split(":");
  switch(step) {
    case "create":
      interaction.reply({
        ephemeral: true,
        content: `
Welches Paket möchtest du?

Pakete:

1. Rundum Sorglos Paket
Beinhaltet:
- Videos cutten
- Thumbnail erstellen
- Hochladen und verwalten (Titel und Beschreibung erstellen, Video(s) verwalten)

2. Editing Paket
Beinhaltet:
- Videos cutten
- Thumbnail erstellen
- Endprodukt an die influencende Person zurückschicken

3. Nur Cutting:
Beinhaltet:
- Videos cutten
- Fertiges Video an die influencende Person zurückschicken`,
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId("request:package:1")
              .setLabel("Rundum Sorglos Paket")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("request:package:2")
              .setLabel("Editing Paket")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("request:package:3")
              .setLabel("Nur Cutting")
              .setStyle(ButtonStyle.Secondary),
          )
        ],
      });
      await sleep(60);
      await interaction.deleteReply();

      break;
    case "package":
      interaction.showModal(new ModalBuilder()
        .setCustomId(`request:submit:${args[0]}`)
        .setTitle("Beschreibe deinen Auftrag")
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>()
            .setComponents(
              new TextInputBuilder()
                .setCustomId("title")
                .setLabel("Videotitel / Thema")
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Ein tolles Video"),
            ),
          new ActionRowBuilder<TextInputBuilder>()
            .setComponents(
              new TextInputBuilder()
                .setCustomId("description")
                .setLabel("Beschreibung")
                .setRequired(true)
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Beschreibe dein Video und deine Anforderungen, etc.")
            )
        )
      );

  }
  console.log(step, args, config);
});