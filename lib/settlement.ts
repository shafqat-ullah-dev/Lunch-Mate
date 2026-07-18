// Pure money-math for lunch settlement. No I/O — kept separate so it can be
// unit-tested in isolation (this is the code that decides who owes whom).

export interface UserSettlementInput {
  userId: string
  userName: string
  linked_user_id?: string | null
  isPresent: boolean
  share: number
  paid: number
  totalBalance?: number
}

export interface UserSettlementDetail extends UserSettlementInput {
  balance: number
}

// Round to 2 decimals and treat sub-1 residue as settled (kills rounding dust).
export function normalizeBalance(value: number): number {
  let finalBalance = Math.round(value * 100) / 100
  if (Math.abs(finalBalance) < 1) finalBalance = 0
  return finalBalance
}

// Given a day's total expense and each user's share/paid, compute per-user
// balance. When the group paid MORE than the bill (excess), the overpayers get
// reimbursed proportionally to how much they overpaid — so the credit lands on
// whoever actually fronted the money, not on people who just met their share.
export function calculateSettlementAwareBalances(
  totalExpense: number,
  users: UserSettlementInput[]
): UserSettlementDetail[] {
  const totalPaid = users.reduce((sum, u) => sum + u.paid, 0)
  const excess = Math.max(0, totalPaid - totalExpense)

  if (excess <= 1.0) {
    // Small buffer for rounding: no meaningful excess, plain paid-minus-share.
    return users.map((u) => ({ ...u, balance: Math.round((u.paid - u.share) * 100) / 100 }))
  }

  const totalOverpaidAmount = users.reduce((sum, u) => sum + Math.max(0, u.paid - u.share), 0)

  return users.map((u) => {
    const userOverpaidAmount = Math.max(0, u.paid - u.share)
    // Distribute excess to those who paid more than their share (primary payers).
    const reimbursement = totalOverpaidAmount > 0 ? (userOverpaidAmount / totalOverpaidAmount) * excess : 0
    const balance = u.paid - u.share - reimbursement
    return { ...u, balance: normalizeBalance(balance) }
  })
}
