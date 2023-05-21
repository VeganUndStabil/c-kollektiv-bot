import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";


@Entity("configuration")
export class Configuration extends BaseEntity {
  @PrimaryColumn("varchar")
  id!: string;

  /**
   * channel category where request channels are created
   * (for example Aufträge)
   */
  @Column("varchar", { nullable: true })
  requestChannelId!: string;

  /**
   * channel where cutters are notified of available requests
   * (for example Videobearbeitung/neue aufträge)
   */
  @Column("varchar", { nullable: true })
  cuttingChannelId!: string;

  /**
   * channel where thumbnail creators are notified of available
   * requests (for example Grafikdesign/neue-aufträge)
   */
  @Column("varchar", { nullable: true })
  thumbnailChannelId!: string;

  /**
   * channel category where finished or stale requests are moved to
   * (for example Archiv)
   */
  @Column("varchar", { nullable: true })
  archiveChannelId!: string;
}