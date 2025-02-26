import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Player } from './player.entity';
import { Coach } from './coach.entity';
import { Competition } from './competition.entity';

@Entity()
@ObjectType()
export class Team {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  tla: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  shortName: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  areaName: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  address: string;

  @OneToMany(() => Player, player => player.team)
  @Field(() => [Player], { nullable: true })
  players: Player[];

  @OneToMany(() => Coach, coach => coach.team)
  @Field(() => [Coach], { nullable: true })
  coaches: Coach[];

  @ManyToMany(() => Competition, competition => competition.teams)
  @Field(() => [Competition], { nullable: true })
  competitions: Competition[];
} 