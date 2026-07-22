import { describe, it, expect } from "vitest"
import {
  calculateSettlementAwareBalances,
  normalizeBalance,
  type UserSettlementInput,
} from "./settlement"

function u(partial: Partial<UserSettlementInput> & { userId: string }): UserSettlementInput {
  return {
    userName: partial.userId,
    isPresent: true,
    share: 0,
    paid: 0,
    ...partial,
  }
}

describe("normalizeBalance", () => {
  it("rounds to 2 decimals", () => {
    expect(normalizeBalance(10.123)).toBe(10.12)
    expect(normalizeBalance(10.126)).toBe(10.13)
  })

  it("treats sub-1 residue as settled (0)", () => {
    expect(normalizeBalance(0.99)).toBe(0)
    expect(normalizeBalance(-0.5)).toBe(0)
  })

  it("keeps values at or above 1", () => {
    expect(normalizeBalance(1)).toBe(1)
    expect(normalizeBalance(-1.5)).toBe(-1.5)
  })
})

describe("calculateSettlementAwareBalances", () => {
  it("no excess: balance is paid minus share", () => {
    // Bill 300, split 3 ways (100 each). A pays the whole 300.
    const res = calculateSettlementAwareBalances(300, [
      u({ userId: "A", share: 100, paid: 300 }),
      u({ userId: "B", share: 100, paid: 0 }),
      u({ userId: "C", share: 100, paid: 0 }),
    ])
    const by = Object.fromEntries(res.map((r) => [r.userId, r.balance]))
    expect(by.A).toBe(200) // paid 300, owed 100 -> +200 credit
    expect(by.B).toBe(-100)
    expect(by.C).toBe(-100)
  })

  it("balances sum to ~0 when fully paid and no excess", () => {
    const res = calculateSettlementAwareBalances(300, [
      u({ userId: "A", share: 100, paid: 150 }),
      u({ userId: "B", share: 100, paid: 150 }),
      u({ userId: "C", share: 100, paid: 0 }),
    ])
    const sum = res.reduce((s, r) => s + r.balance, 0)
    expect(Math.abs(sum)).toBeLessThanOrEqual(0.01)
  })

  it("excess is reimbursed proportionally to overpayment", () => {
    // Bill 100. A pays 150, B pays 50. Shares 50 each. Group overpaid by 100.
    // All excess (100) came from A's overpayment, so A gets it all back.
    const res = calculateSettlementAwareBalances(100, [
      u({ userId: "A", share: 50, paid: 150 }),
      u({ userId: "B", share: 50, paid: 50 }),
    ])
    const by = Object.fromEntries(res.map((r) => [r.userId, r.balance]))
    // A: paid-share = 100, minus reimbursement 100 => 0 (excess handed back).
    expect(by.A).toBe(0)
    // B: paid 50, share 50 => 0.
    expect(by.B).toBe(0)
  })

  it("splits excess between two overpayers by their share of overpayment", () => {
    // Bill 100. Paid: A 80, B 60, C 0 -> totalPaid 140, excess 40.
    // Overpayment: A 60, B 40 (total 100). Excess split 60:40.
    // A reimb = 60/100*40 = 24 -> balance 60-24 = 36.
    // B reimb = 40/100*40 = 16 -> balance 40-16 = 24.
    const res = calculateSettlementAwareBalances(100, [
      u({ userId: "A", share: 20, paid: 80 }),
      u({ userId: "B", share: 20, paid: 60 }),
      u({ userId: "C", share: 60, paid: 0 }),
    ])
    const by = Object.fromEntries(res.map((r) => [r.userId, r.balance]))
    expect(by.A).toBe(36)
    expect(by.B).toBe(24)
    expect(by.C).toBe(-60)
    // Whole day nets to zero.
    expect(by.A + by.B + by.C).toBe(0)
  })

  it("handles zero-expense day (free lunch) without NaN", () => {
    const res = calculateSettlementAwareBalances(0, [
      u({ userId: "A", share: 0, paid: 0, isPresent: false }),
    ])
    expect(res[0].balance).toBe(0)
    expect(Number.isNaN(res[0].balance)).toBe(false)
  })

  it("preserves all input fields on output", () => {
    const res = calculateSettlementAwareBalances(100, [
      u({ userId: "A", userName: "Alice", share: 100, paid: 100, linked_user_id: "auth-1" }),
    ])
    expect(res[0].userName).toBe("Alice")
    expect(res[0].linked_user_id).toBe("auth-1")
  })
})
