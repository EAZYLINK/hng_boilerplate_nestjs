import {
  Controller,
  Get,
  Param,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InviteService } from './invite.service';

@ApiBearerAuth()
@ApiTags('Organisation Invites')
@Controller('organizations')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @ApiOperation({ summary: 'Get All Invitations' })
  @ApiResponse({
    status: 200,
    description: 'The found record',
  })
  @Get('invites')
  async findAllInvitations() {
    const allInvites = await this.inviteService.findAllInvitations();
    return allInvites;
  }

  @Post(':org_id/invite')
  async generateInviteLink(@Param('org_id') orgId: string, @Body() data: { emails: string[] }) {
    return this.inviteService.sendInviteLinks(data.emails, orgId);
  }
}
