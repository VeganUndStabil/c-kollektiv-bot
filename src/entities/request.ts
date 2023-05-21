import { User } from "src/entities/user";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";


export enum RequestStatus {
  OPEN = "open",
  CLOSED = "closed",
  IN_PROGRESS = "in-progress",
}

export enum PackageType {
  RUNDUM_SORGLOS = "rundum-sorglos",
  EDITING = "editing",
  CUTTING = "cutting",
}

@Entity("requests")
export class Request extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid!: string;

  @Column("varchar")
  title!: string;

  @Column("varchar")
  description!: string;

  @Column("varchar", { nullable: true })
  source?: string;

  @Column("varchar", { nullable: true })
  reference?: string;

  @Column({
    type: "enum",
    enum: RequestStatus,
    default: RequestStatus.OPEN,
  })
  status!: RequestStatus;

  @Column({
    type: "enum",
    enum: PackageType,
    default: PackageType.RUNDUM_SORGLOS
  })
  type!: PackageType;

  @Column("varchar")
  serverId!: string;

  @Column("varchar")
  channelId!: string;

  @Column("varchar")
  messageId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date;

  @ManyToOne(() => User, user => user.requests)
  author!: User;

  @ManyToOne(() => User, user => user.assignedCuttingRequests, { nullable: true })
  assignedCutter?: User;

  @ManyToOne(() => User, user => user.assignedThumbnailRequests, { nullable: true })
  assignedThumbnailCreator?: User;

  @ManyToOne(() => User, user => user.assignedModerationRequests, { nullable: true })
  assignedModerator?: User;
}