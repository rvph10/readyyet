import { Controller, Post, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { EmailStatus } from "@readyyet/db";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Request, Response } from "express";
import { PrismaService } from "../database/prisma.service";
import { WEBHOOK_EVENT_TO_STATUS } from "./email-status";
import { getResendClient } from "./resend-client";

@ApiTags("Email")
@AllowAnonymous()
// Resend can deliver events in bursts; throttling would cause us to drop
// legitimate, already signature-verified webhook calls.
@SkipThrottle()
@Controller("webhooks/resend")
export class EmailWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  // Called by Resend, not a client of this API, real request-signing
  // requirements don't map onto a "try it out" reference page.
  @ApiExcludeEndpoint()
  async handle(@Req() req: Request, @Res() res: Response) {
    // req.body is the raw Buffer here, see main.ts's scoped
    // express.raw() mount for /webhooks/resend, signature verification
    // needs the exact original bytes, not a re-serialized JS object.
    const payload = (req.body as Buffer).toString();

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
            // tsc rejects the bare interface (no index signature, so not an
            // InputJsonValue), this rule's own assignability check disagrees.
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            lastEvent: event as object,
            ...(status === EmailStatus.DELIVERED && { deliveredAt: new Date() }),
          },
        });
      }
    }

    res.status(200).send();
  }
}
