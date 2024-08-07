import { Module } from '@nestjs/common';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';
import { Invite } from './entities/invite.entity';
import { Organisation } from '../organisations/entities/organisations.entity';
import { EmailService } from '../email/email.service';

@Module({
  imports: [Invite, Organisation],
  controllers: [InviteController],
  providers: [InviteService, EmailService],
})
export class InviteModule {}
