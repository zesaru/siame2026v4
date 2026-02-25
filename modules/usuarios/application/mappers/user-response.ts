import type {
  CreatedUserDto,
  CreatedUserSource,
  UpdatedUserDto,
  UpdatedUserSource,
  UserDetailDto,
  UserDetailSource,
  UserListDto,
  UserListSource,
} from "../dto"

export function toUserListDto(source: UserListSource): UserListDto {
  return {
    id: source.id,
    name: source.name,
    email: source.email,
    role: source.role,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    _count: source._count,
  }
}

export function toUsersListDto(sources: UserListSource[]): UserListDto[] {
  return sources.map(toUserListDto)
}

export function toCreatedUserDto(source: CreatedUserSource): CreatedUserDto {
  return {
    id: source.id,
    name: source.name,
    email: source.email,
    role: source.role,
    createdAt: source.createdAt,
  }
}

export function toUserDetailDto(source: UserDetailSource): UserDetailDto {
  return {
    id: source.id,
    name: source.name,
    email: source.email,
    role: source.role,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    _count: source._count,
  }
}

export function toUpdatedUserDto(source: UpdatedUserSource): UpdatedUserDto {
  return {
    id: source.id,
    name: source.name,
    email: source.email,
    role: source.role,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}
