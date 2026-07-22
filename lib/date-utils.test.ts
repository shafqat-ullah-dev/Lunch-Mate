import { describe, it, expect } from "vitest"
import {
  formatDate,
  formatDateShort,
  getDayName,
  getWeekStart,
  getWeekEnd,
  formatWeekRange,
  formatMonthYear,
  getMonthKey,
  getWeekKey,
} from "./date-utils"

describe("date-utils", () => {
  it("formatDate: long form", () => {
    expect(formatDate("2026-04-14")).toBe("14 April, 2026")
  })

  it("formatDateShort: day + short month", () => {
    expect(formatDateShort("2026-04-14")).toBe("14 Apr")
  })

  it("getDayName: weekday short", () => {
    // 2026-04-14 is a Tuesday.
    expect(getDayName("2026-04-14")).toBe("Tue")
  })

  it("getWeekStart: snaps to Monday", () => {
    // Wednesday 2026-04-15 -> Monday 2026-04-13.
    const start = getWeekStart("2026-04-15")
    expect(start.getDate()).toBe(13)
  })

  it("getWeekStart: Sunday belongs to the week that started the prior Monday", () => {
    // Sunday 2026-04-19 -> Monday 2026-04-13.
    const start = getWeekStart("2026-04-19")
    expect(start.getDate()).toBe(13)
  })

  it("getWeekEnd: Sunday six days after week start", () => {
    const end = getWeekEnd("2026-04-15")
    expect(end.getDate()).toBe(19)
  })

  it("formatWeekRange: same month", () => {
    expect(formatWeekRange(new Date(2026, 3, 13))).toBe("13 - 19 Apr, 2026")
  })

  it("formatWeekRange: spanning two months", () => {
    expect(formatWeekRange(new Date(2026, 3, 27))).toBe("27 Apr - 3 May, 2026")
  })

  it("formatMonthYear", () => {
    expect(formatMonthYear("2026-04-14")).toBe("April 2026")
  })

  it("getMonthKey: zero-padded", () => {
    expect(getMonthKey("2026-04-14")).toBe("2026-04")
    expect(getMonthKey("2026-12-01")).toBe("2026-12")
  })

  it("getWeekKey: ISO date of the Monday", () => {
    expect(getWeekKey("2026-04-15")).toBe("2026-04-13")
  })
})
