import { HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InviteDto } from './dto/invite.dto';
import { Invite } from './entities/invite.entity';
import { Organisation } from '../../modules/organisations/entities/organisations.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SendEmailDto } from '../email/dto/email.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class InviteService {
  constructor(
    @InjectRepository(Invite) private inviteRepository: Repository<Invite>,
    @InjectRepository(Organisation) private organisationRepository: Repository<Organisation>,
    private readonly emailService: EmailService
  ) {}

  async sendInviteLinks(emails: string[], orgId: string) {
    const organisation = await this.organisationRepository.findOne({
      where: { id: orgId },
    });
    if (!organisation)
      throw new NotFoundException({
        message: 'The organisation with ID ${id} does not exist',
        status_code: HttpStatus.NOT_FOUND,
      });
    for (const email of emails) {
      const token = uuidv4();
      const inviteLink = this.generateInviteLink(email, organisation, token);
      const invite = await this.inviteRepository.create({
        token,
        organisation: organisation,
        isGeneric: true,
      });
      await this.inviteRepository.save(invite);
      const emailData: SendEmailDto = {
        to: email,
        subject: 'Organisation Invitation',
        template: 'invite',
        context: {
          inviteLink,
          organisationName: organisation.name,
        },
      };
      const emailResponse = await this.emailService.sendEmail(emailData);
      if (emailResponse.status_code !== HttpStatus.OK) {
        throw new Error('Error sending invitation email');
      }
      return {
        status: 'success',
        message: 'Invite link sent successfully',
        status_code: HttpStatus.CREATED,
      };
    }
  }

  generateInviteLink(email: string, organization: any, token: string): string {
    const clientUrl = process.env.FRONTEND_URL;
    return `h${clientUrl}/invite?org=${organization.id}&email=${email}&token=${token}`;
  }

  async findAllInvitations(): Promise<{ status_code: number; message: string; data: InviteDto[] }> {
    try {
      const invites = await this.inviteRepository.find();
      const allInvites: InviteDto[] = invites.map(invite => {
        return {
          token: invite.token,
          id: invite.id,
          isAccepted: invite.isAccepted,
          isGeneric: invite.isGeneric,
          organisation: invite.organisation,
          email: invite.email,
        };
      });

      const responseData = {
        status_code: HttpStatus.OK,
        message: 'Successfully fetched invites',
        data: allInvites,
      };

      return responseData;
    } catch (error) {
      throw new InternalServerErrorException(`Internal server error: ${error.message}`);
    }
  }
}
