import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Team } from './team.entity';

@Entity()
@ObjectType()
export class Player {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @Column({ nullable: true })
  @Field(() => String, { nullable: true })
  position: string;

  @Column({ nullable: true, type: 'varchar' })
  @Field(() => String, { nullable: true })
  dateOfBirth: string | null;

  @Column({ nullable: true })
  @Field(() => String, { nullable: true })
  nationality: string;

  @ManyToOne(() => Team, team => team.players, { nullable: true })
  @Field(() => Team, { nullable: true })
  team: Team;
} 