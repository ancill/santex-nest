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
  @Field({ nullable: true })
  position: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  dateOfBirth: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  nationality: string;

  @ManyToOne(() => Team, team => team.players)
  @Field(() => Team)
  team: Team;
} 