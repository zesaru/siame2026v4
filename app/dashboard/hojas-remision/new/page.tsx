"use client"

import HojaRemisionEditor from "@/components/dashboard/HojaRemisionEditor"
import { createHojaRemision } from "@/app/dashboard/hojas-remision/actions"
import type { HojaRemisionFormData } from "@/components/dashboard/HojaRemisionForm"

export default function NewHojaRemisionPage() {
  return (
    <HojaRemisionEditor
      mode="create"
      onSave={async (data: HojaRemisionFormData, file?: File | null) => createHojaRemision(data, file ?? undefined)}
    />
  )
}
