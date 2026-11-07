const TRIAL_DAYS = 14;
const URGENT_TRIAL_DAYS = 3;

export const isUrgentTrial = (daysLeft: number) => daysLeft <= URGENT_TRIAL_DAYS;

// One segment per day of the trial, the days gone faded.
export function TrialMeter({ daysLeft, className }: { daysLeft: number; className: string }) {
  return (
    <div aria-hidden="true" className={`flex gap-0.5 ${className}`}>
      {Array.from({ length: TRIAL_DAYS }, (_, day) => (
        <span
          key={day}
          className={`h-full flex-1 rounded-full ${
            day < TRIAL_DAYS - daysLeft ? "bg-surface/25" : isUrgentTrial(daysLeft) ? "bg-surface" : "bg-brand"
          }`}
        />
      ))}
    </div>
  );
}
