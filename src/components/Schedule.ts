export interface TriggerFunction {
    (): void;
}
export type IntervalType = "minute" | "hourly" | 'daily' | 'hours';
export interface HourlyInterval { minutes: number } // Repeat every hour at <time>
export interface DailyInterval { hours: number, minutes: number } // Repeat once a day at <time>
export interface Hours { hours: number } // Repeat every X hours

export interface ScheduleInterval {
    intervalType: IntervalType,
    options: HourlyInterval | DailyInterval | Hours | number
}

function validateScheduleInterval(interval: ScheduleInterval) {
    switch (interval.intervalType) {
        case "hourly":
            return typeof interval.options === "object" && interval.options !== null && "minutes" in interval.options && !("hours" in interval.options);
        case "daily":
            return typeof interval.options === "object" && interval.options !== null && "hours" in interval.options && "minutes" in interval.options;
        case "hours":
            return typeof interval.options === "object" && interval.options !== null && "hours" in interval.options && !("minutes" in interval.options);
        case "minute":
            return typeof interval.options === "number";
    }
}

export class ScheduleIntervalGenerator {
    static getInterval(type: IntervalType, ...args: number[]): ScheduleInterval {
        switch (type) {
            case "hourly":
                if (args.length != 1) throw new Error("Invalid arguments. Expected 1 argument, got " + args.length);
                return { intervalType: "hourly", options: { minutes: args[0] } };
            case "daily":
                if (args.length != 2) throw new Error("Invalid arguments. Expected 2 arguments, got " + args.length);
                return { intervalType: "daily", options: { hours: args[0], minutes: args[1] } };
            case "hours":
                if (args.length != 1) throw new Error("Invalid arguments. Expected 1 argument, got " + args.length);
                return { intervalType: "hours", options: { hours: args[0] } };
            case "minute":
                if (args.length != 1) throw new Error("Invalid arguments. Expected 1 argument, got " + args.length);
                return { intervalType: "minute", options: args[0] };
        }
    }
}

export default class Schedule {
    private intervals: {
        lastTriggered: Date | null,
        interval: ScheduleInterval
    }[];
    private triggerFunction: TriggerFunction;
    private intervalId: NodeJS.Timeout;

    constructor(intervals: ScheduleInterval[], triggerFunction: TriggerFunction) {
        this.triggerFunction = triggerFunction;
        this.intervals = intervals.map(interval => ({
            lastTriggered: null,
            interval
        }));
        for (const { interval } of this.intervals) {
            if (!validateScheduleInterval(interval)) {
                throw new Error(`Invalid schedule interval: ${JSON.stringify(interval)}`);
            }
        }
        this.intervalId = setInterval(() => this.checkIntervals(), 1000);
    }

    public terminate() {
        clearInterval(this.intervalId);
    }

    shouldTrigger(lastTriggered: Date | null, interval: ScheduleInterval): boolean {
        const now = new Date();
        switch (interval.intervalType) {
            case "hourly":
                var hourlyInterval = interval.options as HourlyInterval;
                return lastTriggered?.getHours() !== now.getHours() && hourlyInterval.minutes === now.getMinutes();
            case "daily":
                var dailyInterval = interval.options as DailyInterval;
                return lastTriggered?.getDate() !== now.getDate() && dailyInterval.hours === now.getHours() && dailyInterval.minutes === now.getMinutes();
            case "hours":
                var hoursInterval = interval.options as Hours;
                return Math.floor((now.getTime() - (lastTriggered?.getTime() || 0)) / 1000 / 60 / 60) >= hoursInterval.hours;
            case "minute":
                return lastTriggered?.getMinutes() !== now.getMinutes();
            default:
                return false;
        }
    }

    checkIntervals() {
        const now = new Date();
        for (const entry of this.intervals) {
            if (this.shouldTrigger(entry.lastTriggered, entry.interval)) {
                this.triggerFunction();
                entry.lastTriggered = new Date();
            }
        }
    }
}