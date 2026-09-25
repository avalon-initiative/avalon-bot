export function isAuthorized(memberRoleIds: readonly string[], allowedRoleIds: readonly string[]): boolean {
  return memberRoleIds.some((id) => allowedRoleIds.includes(id));
}
