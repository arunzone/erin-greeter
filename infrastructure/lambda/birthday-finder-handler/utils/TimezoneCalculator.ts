import { DateTime } from 'luxon';

export class TimezoneCalculator {
  private readonly targetHour: number;
  private readonly targetMinute: number;
  private readonly windowMinutes: number;

  constructor(targetHour: number, targetMinute: number, windowMinutes: number = 20, private readonly now: DateTime = DateTime.utc()) {
    this.targetHour = targetHour;
    this.targetMinute = targetMinute;
    this.windowMinutes = windowMinutes;
  }

  findTimezonesInWindow(): string[] {
    const allTimezones = Intl.supportedValuesOf('timeZone');
    const matchingTimezones: string[] = [];
    const now = this.now;

    const targetMinutesFromMidnight = this.targetHour * 60 + this.targetMinute;
    const windowStart = targetMinutesFromMidnight - Math.floor(this.windowMinutes / 2);
    const windowEnd = targetMinutesFromMidnight + Math.floor(this.windowMinutes / 2);

    for (const timezone of allTimezones) {
      const localTime = now.setZone(timezone);
      const localMinutesFromMidnight = localTime.hour * 60 + localTime.minute;

      if (localMinutesFromMidnight >= windowStart && localMinutesFromMidnight <= windowEnd) {
        matchingTimezones.push(timezone);
      }
    }

    console.log("matchingTimezones", matchingTimezones);
    return matchingTimezones;
  }

  getCurrentDateInTimezones(timezones: string[]): { month: number; day: number } {
    if (timezones.length === 0) {
      const now = this.now;
      return { month: now.month, day: now.day };
    }

    const now = this.now;
    const firstTimezone = timezones[0];
    const localDate = now.setZone(firstTimezone);

    return { month: localDate.month, day: localDate.day };
  }
}
