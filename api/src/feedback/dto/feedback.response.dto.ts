export class FeedbackTicketDto {
  id!: string;
  title!: string;
}

export class FeedbackCustomerDto {
  id!: string;
  fullName!: string;
  // To answer them, null when they gave none.
  email!: string | null;
  phone!: string | null;
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
  // Across every page, for what the filters match.
  total!: number;
}
