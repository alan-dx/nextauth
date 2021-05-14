import { AuthTokenError } from './../services/errors/AuthTokenError';
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { destroyCookie, parseCookies } from "nookies";
import decode from 'jwt-decode'
import { validateUserPermssions } from './validateUserPermissions';

type withSSRAuthOptions = {
  permissions: string[],
  roles?: string[]
}

export function withSSRAuth(fn: GetServerSideProps, options?: withSSRAuthOptions) {
  return async (ctx: GetServerSidePropsContext) => {
    const cookies = parseCookies(ctx)//server-side, pass the context
    const token = cookies['nextauth.token']

    if (!token) {
      return {
        redirect: {
          destination: '/',
          permanent: false
        }
      }
    }

    if (options) {
      const user = decode<{ permissions: string[], roles: string[] }>(token)
      const { permissions, roles } = options
  
      const userHasValidPermissions = validateUserPermssions({
        user,
        permissions,
        roles
      })

      if (!userHasValidPermissions) {
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false
          }
        }
      }

    }

    try {
      return await fn(ctx)
    } catch (error) {
  
      if (error instanceof AuthTokenError) {
        destroyCookie(ctx, 'nextauth.token')
        destroyCookie(ctx, 'nextauth.refreshToken')
    
        return {
          redirect: {
            destination: '/',
            permanent: false
          }
        }
      }

    }

  }
}