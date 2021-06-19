type User = {
  permissions: string[],
  roles: string[]
}

type ValidateUserPermissionsParams = {
  user: User;
  permissions?: string[];
  roles?: string[];
}

export function validateUserPermssions({
  user,
  permissions,
  roles
}: ValidateUserPermissionsParams) {

  if (permissions?.length > 0) {
    const hasAllPermissions = permissions.every(permission => {//return true if .includes returns truth to everyone 
      return user.permissions.includes(permission)
    })

    if (!hasAllPermissions) {
      return false
    }
  }

  if (roles?.length > 0) {
    const hasAllRoles = roles.some(role => {//return true if .includes returns truth for at least one
      return user.roles.includes(role)
    })

    if (!hasAllRoles) {
      return false
    }
  }

  return true

}