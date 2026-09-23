import { Controller, Post, Req, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { EmailStatus } from "@readyyet/db";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Request, Response } from "express";
import { PrismaService } from "../database/prisma.service";
import { WEBHOOK_EVENT_TO_STATUS } from "./email-status";
import { getResendClient } from "./resend-client";

@AllowAnonymous()
// Resend can deliver events in bursts; throttling would cause us to drop
// legitimate, already signature-verified webhook calls.
@SkipThrottle()
@Controller("webhooks/resend")
export class EmailWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async handle(@Req() req: Request, @Res() res: Response) {
    // req.body is the raw Buffer here, see main.ts's scoped
    // express.raw() mount for /webhooks/resend, signature verification
    // needs the exact original bytes, not a re-serialized JS object.
    const payload = req.body.toString();

    let event;
    try {
      event = getResendClient().webhooks.verify({
        payload,
        headers: {
          id: req.headers["svix-id"] as string,
          timestamp: req.headers["svix-timestamp"] as string,
          signature: req.headers["svix-signature"] as string,
        },
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET as string,
      });
    } catch {
      res.status(400).send();
      return;
    }

    if ("email_id" in event.data) {
      const status = WEBHOOK_EVENT_TO_STATUS[event.type];
      if (status) {
        await this.prisma.emailLog.updateMany({
          where: { resendId: event.data.email_id },
          data: {
            status,
            lastEvent: event as object,
            ...(status === EmailStatus.DELIVERED && { deliveredAt: new Date() }),
          },
        });
      }
    }

    res.status(200).send();
  }
}
