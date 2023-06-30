import { Request } from "src/entities/request";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity, OneToMany,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";


@Entity("users")
export class User extends BaseEntity {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @Column({ type: "varchar" })
  username!: string;

  @Column({ type: "varchar", nullable: true })
  avatarUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date;

  @OneToMany(() => Request, request => request.author)
  requests!: Request[];
}
