export class OverviewWeekDto {
  // The week's Monday, "YYYY-MM-DD" in Brussels.
  week!: string;
  count!: number;
}

export class OverviewSeriesDto {
  total!: number;
  // The last 12 weeks, this one last.
  weeks!: OverviewWeekDto[];
  // Last week up to the same weekday, to compare like with like.
  lastWeekSoFar!: number;
}

export class OverviewLocationsDto extends OverviewSeriesDto {
  // In a trial that hasn't ended.
  trial!: number;
  paying!: number;
  // Paying, with a failed payment Stripe is still retrying.
  pastDue!: number;
  // Never paid after the trial, or stopped paying.
  inactive!: number;
}

export class OverviewSignupDto {
  id!: string;
  name!: string;
  email!: string;
  createdAt!: Date;
  // Their first Business, null for someone who only joined a team.
  businessName!: string | null;
  locations!: number;
  tickets!: number;
}

export class AdminOverviewDto {
  users!: OverviewSeriesDto;
  locations!: OverviewLocationsDto;
  tickets!: OverviewSeriesDto;
  // The 10 newest accounts, newest first.
  latestSignups!: OverviewSignupDto[];
}
