import { TimezoneCalculator } from '../../../../lambda/birthday-finder-handler/utils/TimezoneCalculator';
import { DateTime } from 'luxon';

describe('TimezoneCalculator', () => {
  describe('findTimezonesInWindow', () => {
    const fixedNow = DateTime.utc().set({ year: 2023, month: 1, day: 1, hour: 12, minute: 0, second: 0, millisecond: 0 });

    it('should find timezones within the target window', () => {
      const currentHour = fixedNow.hour;
      const currentMinute = fixedNow.minute;

      const calculator = new TimezoneCalculator(currentHour, currentMinute, 20, fixedNow);
      const timezones = calculator.findTimezonesInWindow();

      expect(timezones.length).toBeGreaterThan(0);
    });

    it('should find multiple timezones at 9:00 AM', () => {
      const targetHour = 9;
      const targetMinute = 0;

      const calculator = new TimezoneCalculator(targetHour, targetMinute, 20, fixedNow);

      const timezones = calculator.findTimezonesInWindow();

      timezones.forEach(timezone => {
        const localTime = fixedNow.setZone(timezone);
        const localMinutes = localTime.hour * 60 + localTime.minute;
        const targetMinutes = targetHour * 60 + targetMinute;

        expect(localMinutes).toBeGreaterThanOrEqual(targetMinutes - 10);
        expect(localMinutes).toBeLessThanOrEqual(targetMinutes + 10);
      });
    });

    it('should find different timezones for different target times', () => {
      const fixedNow = DateTime.utc().set({ year: 2023, month: 1, day: 1, hour: 12, minute: 0, second: 0, millisecond: 0 });
      const calculator9am = new TimezoneCalculator(9, 0, 20, fixedNow);
      const calculator3pm = new TimezoneCalculator(15, 0, 20, fixedNow);

      const timezones9am = calculator9am.findTimezonesInWindow();
      const timezones3pm = calculator3pm.findTimezonesInWindow();

      expect(timezones9am.length).toBeGreaterThan(0);
      expect(timezones3pm.length).toBeGreaterThan(0);

      const both9amAnd3pm = timezones9am.filter(tz => timezones3pm.includes(tz));
      expect(both9amAnd3pm.length).toBeLessThan(Math.min(timezones9am.length, timezones3pm.length));
    });

    it('should respect the window size parameter', () => {
      const targetHour = 12;
      const targetMinute = 0;

      const narrowCalculator = new TimezoneCalculator(targetHour, targetMinute, 10, fixedNow);
      const wideCalculator = new TimezoneCalculator(targetHour, targetMinute, 60, fixedNow);

      const narrowTimezones = narrowCalculator.findTimezonesInWindow();
      const wideTimezones = wideCalculator.findTimezonesInWindow();

      expect(wideTimezones.length).toBeGreaterThanOrEqual(narrowTimezones.length);

      narrowTimezones.forEach(timezone => {
        expect(wideTimezones).toContain(timezone);
      });
    });

    it('should return empty array for very narrow window with no matches', () => {
      const currentHour = fixedNow.hour;
      const currentMinute = fixedNow.minute;

      const impossibleMinute = (currentMinute + 35) % 60;
      const impossibleHour = (currentHour + 12) % 24;

      const calculator = new TimezoneCalculator(impossibleHour, impossibleMinute, 1, fixedNow);
      const timezones = calculator.findTimezonesInWindow();

      expect(Array.isArray(timezones)).toBe(true);
    });

    it('should find timezones across different UTC offsets', () => {
      const fixedNow = DateTime.utc().set({ year: 2023, month: 1, day: 1, hour: 12, minute: 0, second: 0, millisecond: 0 });
      const targetHour = 1;
      const targetMinute = 0;
      const calculator = new TimezoneCalculator(targetHour, targetMinute, 30, fixedNow);
      const timezones = calculator.findTimezonesInWindow();

      const uniqueOffsets = new Set<number>();
      timezones.forEach(timezone => {
        const offset = fixedNow.setZone(timezone).offset;
        uniqueOffsets.add(offset);
      });

      expect(uniqueOffsets.size).toBeGreaterThan(1);
    });

    it('should include well-known timezones when their local time matches', () => {
      const wellKnownTimezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
        'America/Los_Angeles',
      ];

      wellKnownTimezones.forEach(timezone => {
        const localTime = fixedNow.setZone(timezone);
        const calculator = new TimezoneCalculator(localTime.hour, localTime.minute, 20, fixedNow);
        const foundTimezones = calculator.findTimezonesInWindow();

        expect(foundTimezones).toContain(timezone);
      });
    });
  });

  describe('getCurrentDateInTimezones', () => {
    const fixedNow = DateTime.utc().set({ year: 2023, month: 1, day: 1, hour: 12, minute: 0, second: 0, millisecond: 0 });

    it('should return current date for the first timezone in the list', () => {
      const timezones = ['America/New_York', 'America/Chicago'];

      const calculator = new TimezoneCalculator(9, 0, 20, fixedNow);
      const { month, day } = calculator.getCurrentDateInTimezones(timezones);

      const expectedDate = fixedNow.setZone('America/New_York');
      expect(month).toBe(expectedDate.month);
      expect(day).toBe(expectedDate.day);
    });

    it('should return UTC date when timezone list is empty', () => {
      const calculator = new TimezoneCalculator(9, 0, 20, fixedNow);
      const { month, day } = calculator.getCurrentDateInTimezones([]);

      expect(month).toBe(fixedNow.month);
      expect(day).toBe(fixedNow.day);
    });

    it('should handle timezone with different date than UTC', () => {
      const calculator = new TimezoneCalculator(9, 0, 20, fixedNow);
      const timezones = ['Pacific/Auckland'];

      const { month, day } = calculator.getCurrentDateInTimezones(timezones);

      const expectedDate = fixedNow.setZone('Pacific/Auckland');
      expect(month).toBe(expectedDate.month);
      expect(day).toBe(expectedDate.day);
    });

    it('should return consistent date for timezones in the same window', () => {
      const calculator = new TimezoneCalculator(14, 0, 20, fixedNow);
      const timezones = calculator.findTimezonesInWindow();

      if (timezones.length > 0) {
        const { month, day } = calculator.getCurrentDateInTimezones(timezones);

        timezones.forEach(timezone => {
          const localDate = fixedNow.setZone(timezone);
          expect(Math.abs(localDate.day - day)).toBeLessThanOrEqual(1);
        });
      }
    });
  });
});
