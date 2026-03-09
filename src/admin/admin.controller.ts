import { Controller, Get, Param, Render } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Render('dashboard')
  async dashboard() {
    const tokens = await this.prisma.userToken.findMany({
      include: { user: true, provider: true },
      orderBy: { updatedAt: 'desc' },
    });
    const alerts = await this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const events = await this.prisma.tokenEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      tokens,
      alerts,
      events,
    };
  }

  @Get('tokens/:user_open_id')
  @Render('token-detail')
  async tokenDetail(@Param('user_open_id') userOpenId: string) {
    const token = await this.prisma.userToken.findFirst({
      where: { user: { is: { openId: userOpenId } } },
      include: {
        user: true,
        provider: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    return {
      token,
      events: token?.events || [],
      alerts: token?.alerts || [],
    };
  }
}
