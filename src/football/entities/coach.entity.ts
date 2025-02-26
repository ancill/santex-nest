import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Team } from './team.entity';

@Entity()
@ObjectType()
export class Coach {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @Column({ nullable: true, type: 'varchar' })
  @Field(() => String, { nullable: true })
  dateOfBirth: string | null;

  @Column({ nullable: true })
  @Field(() => String, { nullable: true })
  nationality: string;

  @ManyToOne(() => Team, team => team.coaches)
  @Field(() => Team)
  team: Team;
} 