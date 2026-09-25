export class FeedbackTicketDto {
  id!: string;
  title!: string;
}

export class FeedbackCustomerDto {
  id!: string;
  fullName!: string;
}

export class FeedbackHandlerDto {
  id!: string;
  name!: string;
}

export class FeedbackDto {
  id!: string;
  message!: string;
  ticket!: FeedbackTicketDto;
  customer!: FeedbackCustomerDto;
  // Who marked it dealt with, and when, null until then.
  handledAt!: Date | null;
  handledBy!: FeedbackHandlerDto | null;
  createdAt!: Date;
}

export class FeedbackPageDto {
  items!: FeedbackDto[];
  // Pass as ?cursor= for the next page, null on the last one.
  nextCursor!: string | null;
}
