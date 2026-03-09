import axios from 'axios';
import { AlertLevel, AlertStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class AlertService {
  constructor(private readonly prisma: PrismaService) {}

  async raise(
    platformAuthorizationId: string | null,
    kind: string,
    message: string,
    level: AlertLevel = AlertLevel.P1,
    status: AlertStatus = AlertStatus.open,
  ) {
    const alert = await this.prisma.alert.create({
      data: {
        platformAuthorizationId: platformAuthorizationId || (await this.findFallbackAuthorizationId()),
        kind,
        message,
        level,
        status,
      },
    });

    const webhook = process.env.ALERT_WEBHOOK_URL;
    if (webhook) {
      await axios.post(webhook, {
        level,
        kind,
        message,
        alertId: alert.id,
      }).catch(() => undefined);
    }

    return alert;
  }

  private async findFallbackAuthorizationId() {
    const token = await this.prisma.platformAuthorization.findFirst({ orderBy: { createdAt: 'asc' } });
    return token?.id || undefined;
  }
}
