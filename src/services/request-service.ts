import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CategoryChannel,
  ChannelType,
  ChatInputCommandInteraction,
  Client, EmbedBuilder,
  Guild,
  GuildTextBasedChannel,
  ModalBuilder,
  ModalSubmitInteraction, NonThreadGuildBasedChannel,
  PermissionsBitField,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  User as DiscordUser
} from "discord.js";
import {
  DC,
  DiscordController,
  ensureCommand,
  getSingleCached,
  OnButton,
  OnChatCommand,
  OnInit,
  OnModalSubmit
} from "src/discord";
import { Configuration } from "src/entities/configuration";
import { PackageType, Request, RequestStatus } from "src/entities/request";
import { User } from "src/entities/user";
import { sleep } from "src/util/sleep";


@DiscordController("request")
export class RequestService {

  @OnInit
  async onInit(client: Client<true>) {
    await ensureCommand(
      client,
      new SlashCommandBuilder()
        .setName("create-request-wizard-button")
        .setDescription("erstellt einen 'Auftrag erstellen' button")
        .setDMPermission(false)
        .setNSFW(false)
    );
    await ensureCommand(
      client,
      new SlashCommandBuilder()
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

  @OnChatCommand("set-channels")
  async onSetChannels(
    @DC.Interaction interaction: ChatInputCommandInteraction,
    @DC.Option.Channel("request-channel") requestChannel: CategoryChannel,
    @DC.Option.Channel("cutting-channel") cuttingChannel: GuildTextBasedChannel,
    @DC.Option.Channel("thumbnail-channel") thumbnailChannel: GuildTextBasedChannel,
    @DC.Option.Channel("archive-channel") archiveChannel: CategoryChannel,
  ) {
    await Configuration.upsert({
      id: interaction.guildId!,
      archiveChannelId: archiveChannel.id,
      cuttingChannelId: cuttingChannel.id,
      requestChannelId: requestChannel.id,
      thumbnailChannelId: thumbnailChannel.id,
    }, ["id"]);
    await interaction.reply({
      ephemeral: true,
      content: "Channel wurden festgelegt.",
    });
  }

  @OnChatCommand("create-request-wizard-button")
  async onCreateRequestWizardButton(@DC.Interaction interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel!;
    channel.send({
      content: `Mit diesem Knopf startest du den Auftrag`,
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
  }

  @OnButton("create")
  async onRequestCreateButtonPress(
    @DC.Interaction interaction: ButtonInteraction,
  ) {
    const config = await this.getConfig(interaction.guild!);
    await interaction.reply({
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
- Fertiges Video und Thumbnail an dich zurückschicken

3. Nur Cutting:
Beinhaltet:
- Videos cutten
- Fertiges Video an dich zurückschicken`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId(`request:package:${PackageType.RUNDUM_SORGLOS}`)
            .setLabel("Rundum Sorglos Paket")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`request:package:${PackageType.EDITING}`)
            .setLabel("Editing Paket")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`request:package:${PackageType.CUTTING}`)
            .setLabel("Nur Cutting")
            .setStyle(ButtonStyle.Secondary),
        )
      ],
    });
    await sleep(60);
    await interaction.deleteReply();
  }

  @OnButton("package")
  async onPackageSelect(@DC.Interaction interaction: ButtonInteraction) {
    const id = interaction.customId.split(":")[2];
    await interaction.showModal(new ModalBuilder()
      .setCustomId(`request:submit:${id}`)
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
              .setPlaceholder("Schreibe hier deine Vorstellungen für das Video (und Thumbnail) rein")
          )
      ));
  }

  @OnModalSubmit("submit")
  async onModalRequestSubmit(
    @DC.Interaction interaction: ModalSubmitInteraction,
    @DC.Field.Value("title") title: string,
    @DC.Field.Value("description") description: string,
  ) {
    await interaction.deferUpdate();
    const packageType = interaction.customId.split(":")[2] as PackageType;

    const packageText: Record<PackageType, string> = {
      "cutting": "Nur Cutting",
      "editing": "Editing",
      "rundum-sorglos": "Rundum Sorglos"
    };

    await this.upsertUser(interaction.user);
    const request = Request.create({
      serverId: interaction.guildId!,
      type: packageType,
      author: { id: interaction.user.id },
      status: RequestStatus.OPEN,
      title,
      description,
    });
    await Request.save(request);

    const { requestChannelId, cuttingChannelId } = await this.getConfig(interaction.guildId!);
    const category: CategoryChannel = await getSingleCached(interaction.guild!.channels as any, requestChannelId);
    const channel = await category.children.create({
      type: ChannelType.GuildText,
      name: `${request.id}-${title.replace(/\W+/g, "-").toLowerCase().slice(0, 25)}`,
      permissionOverwrites: [
        {
          id: interaction.guildId!,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });
    await channel.send({
      content: `
## Die Nutzer\*in ${interaction.user} hat eine Anfrage für das Paket '${packageText[packageType]}' eröffnet:

### Titel: ${title}

### Beschreibung:
${description}

### Bitte habe etwas geduld, eine Person aus dem Cutting Bereich wird sich bald um deine Anfrage kümmern.
`.trim(),
    });

    const cuttingChannel: GuildTextBasedChannel = await getSingleCached(
      interaction.guild!.channels as any,
      cuttingChannelId
    );
    const cuttingMessage = await cuttingChannel.send({
      content: `
## Die Nutzer\*in ${interaction.user} hat eine Anfrage für das Paket '${packageText[packageType]}' eröffnet:

### Titel:
${title}

### Beschreibung:
${description}`.trim(),
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents([
          new ButtonBuilder()
            .setCustomId(`request:accept:${request.id}:cutting`)
            .setLabel("Cutting übernehmen")
            .setStyle(ButtonStyle.Primary),
          packageType !== PackageType.CUTTING && new ButtonBuilder()
            .setCustomId(`request:accept:${request.id}:all`)
            .setLabel("Cutting und Thumbnail übernehmen")
            .setStyle(ButtonStyle.Primary),
        ].filter(it => it) as any),
      ]
    });

    request.cuttingMessageId = cuttingMessage.id;
    request.channelId = channel.id;
    await Request.save(request);
  }

  @OnButton("accept")
  async onAcceptRequestButtonPress(
    @DC.Interaction interaction: ButtonInteraction,
  ) {
    const [requestId, part] = interaction.customId.split(":").slice(2);
    const request = await Request.findOneOrFail({ where: { id: parseInt(requestId) } });
    if (request.type !== PackageType.CUTTING && part !== "all" && part !== "thumbnail") await this.sendThumbnailMessage(interaction, request);
    const channel: NonThreadGuildBasedChannel & GuildTextBasedChannel = await getSingleCached(interaction.guild!.channels as any, request.channelId);
    await channel.permissionOverwrites.create(interaction.user.id, {
      ViewChannel: true,
    });
    await channel.send({ content: `${interaction.user} übernimmt ${{
      all: 'die Anfrage',
      cutting: 'den Schnitt',
      thumbnail: 'das Thumbnail',
    }[part]}!` });
    await interaction.message.edit({
      components: [],
      embeds: [new EmbedBuilder().setDescription(`${interaction.user} übernimmt ${part === 'all' ? "die Anfrage" : "den Schnitt"}`)],
    });
  }

  async sendThumbnailMessage(interaction: ButtonInteraction, request: Request) {
    const { thumbnailChannelId } = await this.getConfig(interaction.guildId!);
    const thumbnailChannel: GuildTextBasedChannel = await getSingleCached(
      interaction.guild!.channels as any,
      thumbnailChannelId
    );
    const thumbnailMessage = await thumbnailChannel.send({
      content: `
## Die Nutzer\*in ${interaction.user} benötigt ein Thumbnail:

### Titel:
${request.title}

### Beschreibung:
${request.description}`.trim(),
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents([
          new ButtonBuilder()
            .setCustomId(`request:accept:${request.id}:thumbnail`)
            .setLabel("Übernehmen")
            .setStyle(ButtonStyle.Primary),
        ].filter(it => it) as any),
      ]
    });
    request.thumbnailMessageId = thumbnailMessage.id;
    await Request.save(request);
  }

  async upsertUser(user: DiscordUser) {
    await User.upsert({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarURL()!,
    }, {
      conflictPaths: ["id"],
    });
  }


  async getConfig(guild: Guild | string) {
    if (typeof guild !== "string") guild = guild.id;
    return await Configuration.findOneOrFail({ where: { id: guild } });
  }
}
