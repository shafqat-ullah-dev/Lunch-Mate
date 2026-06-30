"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, X } from "lucide-react"
import Link from "next/link"

export function InviteRecovery() {
  const [pendingInvite, setPendingInvite] = useState<{ token: string; orgName: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("pending_invite")
    if (stored) {
      try {
        const data = JSON.parse(stored)
        // Check if it's not too old (e.g., 24 hours)
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          setPendingInvite(data)
        } else {
          localStorage.removeItem("pending_invite")
        }
      } catch (e) {
        localStorage.removeItem("pending_invite")
      }
    }
  }, [])

  if (!pendingInvite || dismissed) return null

  return (
    <Card className="max-w-md w-full bg-primary/5 border-2 border-primary/30 backdrop-blur-2xl shadow-none rounded-[2rem] overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
      
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss pending invitation"
        className="absolute top-4 right-4 p-1 rounded-full hover:bg-primary/10 transition-colors text-primary/60 hover:text-primary cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>

      <CardHeader className="pt-8 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Pending Invitation
            </CardDescription>
        </div>
        <CardTitle className="text-xl font-black uppercase tracking-tight leading-tight">
          Finish Joining {pendingInvite.orgName}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-8 space-y-4">
        <p className="text-xs font-medium opacity-80 leading-relaxed uppercase tracking-wide">
          It looks like you were in the middle of joining a team. Would you like to complete your invitation now?
        </p>
        <Button asChild className="w-full h-12 text-xs font-black uppercase tracking-widest rounded-xl border-2 border-primary/20 hover:border-primary/50 shadow-none group">
          <Link href={`/invite?token=${pendingInvite.token}`}>
            Continue to Join
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
