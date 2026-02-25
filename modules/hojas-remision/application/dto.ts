import type { HojaRemisionRow } from "../domain/repositories"

export type HojaRemisionDto = HojaRemisionRow
export type HojaRemisionSource = HojaRemisionRow

export interface HojasRemisionListResponseDto {
  hojas: HojaRemisionDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
