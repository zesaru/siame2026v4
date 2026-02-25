import type { HojaRemisionDto, HojaRemisionSource, HojasRemisionListResponseDto } from "../dto"

export function toHojaRemisionDto(source: HojaRemisionSource): HojaRemisionDto {
  return { ...source }
}

export function toHojasRemisionListResponseDto(input: {
  hojas: HojaRemisionSource[]
  page: number
  limit: number
  total: number
}): HojasRemisionListResponseDto {
  return {
    hojas: input.hojas.map(toHojaRemisionDto),
    pagination: {
      page: input.page,
      limit: input.limit,
      total: input.total,
      totalPages: Math.ceil(input.total / input.limit),
    },
  }
}
