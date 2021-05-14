import { createContext, ReactNode, useEffect, useState } from "react";
import { setCookie, parseCookies, destroyCookie } from 'nookies'
import Router from 'next/router'
import { api } from "../services/apiClient";

type User = {
  email: string;
  permissions: string[];
  roles: string[]
}

type SignInCredentials = {
  email: string;
  password: string;
}

type AuthContextData = {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void,
  user: User;
  isAuthenticated: boolean;
}

type AuthProviderProps = {
  children: ReactNode
}

export const AuthContext = createContext({} as AuthContextData)

let authChannel: BroadcastChannel //BroadcastChannel only works on browser side**

export function signOut() {
  destroyCookie(undefined, 'nextauth.token')
  destroyCookie(undefined, 'nextauth.refreshToken')

  authChannel.postMessage('signOut')

  Router.push('/')
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>(null)
  const isAuthenticated = !!user

  useEffect(() => {

    authChannel = new BroadcastChannel('auth')// BroadcastChannel MDN API, BroadcastChannel only works on browser side**

    authChannel.onmessage = (message) => {
      switch (message.data) {
        case 'signOut':
          signOut()
          break;
        default:
          break
      }
    }
  }, [])

  useEffect(() => {
    const { 'nextauth.token': token } = parseCookies()

    if (token) {
      api.get('/me')
        .then(response => {
          const { email, permissions, roles } = response.data

          setUser({
            email,
            permissions,
            roles
          })
        })
        .catch(() => {//axios interceptor occurs before that
          signOut()
        })

    }

  }, [])

  async function signIn({email, password}: SignInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password
      })

      const { token, refreshToken, permissions, roles } = response.data

      setCookie(undefined,  // undefined cause is browser/client side 
        'nextauth.token',
        token, // one data for each cookie
        {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/' // to all pages
        }
      )

      setCookie(undefined,  // undefined cause is browser/client side 
        'nextauth.refreshToken',
        refreshToken, // one data for each cookie
        {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/' // to all pages
        }
      )
      
      // sessionStorage
      // localStorage
      // cookies // next-server => [X] (lib: nookies)

      setUser({
        email,
        permissions,
        roles
      })

      api.defaults.headers['Authorization'] = `Bearer ${token}` //it is very important to update the header['Autorization'], as api.ts may have an undefined token **

      Router.push('/dashboard')
    } catch (error) {
      console.log(error)  
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, signOut, user, isAuthenticated }} >
      {children}
    </AuthContext.Provider>
  )
}