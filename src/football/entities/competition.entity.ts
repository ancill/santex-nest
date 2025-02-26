import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Team } from './team.entity';

@Entity()
@ObjectType()
export class Competition {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @Column({ unique: true })
  @Field()
  code: string;

  @Column()
  @Field()
  areaName: string;

  @ManyToMany(() => Team, team => team.competitions)
  @JoinTable()
  @Field(() => [Team])
  teams: Team[];
} 