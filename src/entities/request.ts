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

  @ManyToOne(() => User, user => user.assignedRequests, { nullable: true })
  assigned?: User;
}