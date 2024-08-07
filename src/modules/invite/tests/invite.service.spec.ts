import { HttpStatus, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organisation } from '../../organisations/entities/organisations.entity';
import { User } from '../../user/entities/user.entity';
import { Invite } from '../entities/invite.entity';
import { InviteService } from '../invite.service';
import { v4 as uuidv4 } from 'uuid';
import { mockInvitesResponse } from '../mocks/mockInvitesReponse';
import { mockInvites } from '../mocks/mockInvites';
import { EmailService } from '../../email/email.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config'; // import ConfigService
import { mockOrg } from '../mocks/mockOrg';

jest.mock('uuid');

describe('InviteService', () => {
  let service: InviteService;
  let emailService: EmailService;
  let repository: Repository<Invite>;
  let organisationRepo: Repository<Organisation>;
  let mailerService: MailerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        EmailService,
        {
          provide: MailerService, // Mock MailerService
          useValue: {
            sendMail: jest.fn().mockResolvedValue(true), // mock the sendMail method
          },
        },
        {
          provide: getRepositoryToken(Invite),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Organisation),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: ConfigService, // Provide a mock ConfigService if needed
          useValue: {
            get: jest.fn().mockReturnValue({}), // Mock any config values if needed
          },
        },
      ],
    }).compile();

    service = module.get<InviteService>(InviteService);
    emailService = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);
    repository = module.get<Repository<Invite>>(getRepositoryToken(Invite));
    organisationRepo = module.get<Repository<Organisation>>(getRepositoryToken(Organisation));
  });

  it('should fetch all invites', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue(mockInvites);

    const result = await service.findAllInvitations();

    expect(result).toEqual({
      status_code: 200,
      message: 'Successfully fetched invites',
      data: mockInvitesResponse,
    });
  });

  it('should throw an internal server error if an exception occurs', async () => {
    jest.spyOn(repository, 'find').mockRejectedValue(new Error('Test error'));

    await expect(service.findAllInvitations()).rejects.toThrow(InternalServerErrorException);
  });

  describe('createInvite', () => {
    it('should create an invite and return a link', async () => {
      const mockToken = 'mock-uuid';
      const mockInvites = { id: '1', token: mockToken };

      jest.spyOn(organisationRepo, 'findOne').mockResolvedValue(mockOrg as Organisation);
      jest.spyOn(repository, 'create').mockReturnValue(mockInvites as Invite);
      jest.spyOn(repository, 'save').mockResolvedValue(mockInvites as Invite);
      (uuidv4 as jest.Mock).mockReturnValue(mockToken);

      const result = await service.createInvite('1');

      expect(result).toEqual({
        status_code: HttpStatus.OK,
        message: 'Invite link generated successfully',
        link: `${process.env.FRONTEND_URL}/invite?token=${mockToken}`,
      });

      expect(organisationRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(repository.create).toHaveBeenCalledWith({
        token: mockToken,
        organisation: mockOrg,
        isGeneric: true,
      });
      expect(repository.save).toHaveBeenCalledWith(mockInvites);
    });

    it('should throw NotFoundException if organisation is not found', async () => {
      jest.spyOn(organisationRepo, 'findOne').mockResolvedValue(null);

      await expect(service.createInvite('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendInviteLinks', () => {
    it('should send invite links successfully', async () => {
      const mockOrganisation = { id: 'org-id', name: 'Test Org' } as Organisation;
      const mockEmails = ['test@example.com'];

      jest.spyOn(organisationRepo, 'findOne').mockResolvedValue(mockOrganisation);
      jest.spyOn(repository, 'create').mockReturnValue({} as Invite);
      jest.spyOn(repository, 'save').mockResolvedValue({} as Invite);
      jest
        .spyOn(emailService, 'sendEmail')
        .mockResolvedValue({ status_code: 200, message: 'Invite link sent successfully' });

      const result = await service.sendInviteLinks(mockEmails, 'org-id');

      expect(result).toEqual({
        status: 'success',
        message: 'Invite link sent successfully',
        status_code: 201,
      });
      expect(organisationRepo.findOne).toHaveBeenCalledWith({ where: { id: 'org-id' } });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });
});
