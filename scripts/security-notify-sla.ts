import { sendSlaBreachNotificationNow } from "../lib/security/security-notifications"

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes("--force")
  const result = await sendSlaBreachNotificationNow({
    source: "scheduled",
    force,
  })

  console.log("[security:notify-sla]", JSON.stringify(result))
}

main().catch((error) => {
  console.error("[security:notify-sla] ERROR", error)
  process.exit(1)
})
