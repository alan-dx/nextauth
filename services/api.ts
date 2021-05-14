import { AuthTokenError } from './errors/AuthTokenError';
import axios, { AxiosError } from 'axios'
import { parseCookies, setCookie } from 'nookies'
import { signOut } from '../contexts/AuthContext'

// THIS FILE IS ONLY CALLED ONCE: WHEN THE APP LOADS

let isRefreshing = false
let failedRequestsQueue = []

export function setupApiClient(ctx = undefined) {//nookies doesn't work in server side without request context

  let cookies = parseCookies(ctx)
  // only called the first time the application is loaded, so we need uptade it every change **
  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  })

  //AULA: REALIZANDO REFRESH DO TOKEN...; CHAPTER IV

  // can be called many times
  api.interceptors.response.use(response => {
    //success case, just return the response
    return response
  }, (error: AxiosError) => {
    //error case
    if (error.response.status === 401) {
      if (error.response.data?.code === 'token.expired') { // refresh token
        cookies = parseCookies(ctx) //get updated cookies on every call

        const {'nextauth.refreshToken': refreshToken} = cookies
        const originalConfig = error.config// takes all the configuration of each request that gave an error (remember: interceptor will be called many times)
        //even error.config

        if (!isRefreshing) { //prevents other calls in progress from also attempting to update the token
          isRefreshing = true

          api.post('/refresh', {//refresh token
            refreshToken
          }).then(response => {
            const { token } = response.data
            
            setCookie(ctx, 'nextauth.token', token, { //set the new Token
              nextAge: 60 * 60 * 24 * 30,
              path: '/'
            })
            
            setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, { // set the new refreshToken
              nextAge: 60 * 60 * 24 * 30,
              path: '/'
            })
    
            api.defaults.headers['Authorization'] = `Bearer ${token}` // update **

            //WHEN refresh request end:

            failedRequestsQueue.forEach(request => request.onSuccess(token)) // call each request on the queue, WHEN THE REQUEST TO refresh FINISH
            failedRequestsQueue = [] // clean the queue again
          }).catch(error => {
            failedRequestsQueue.forEach(request => request.onFailure(error)) // in case error
            failedRequestsQueue = [] // clean the queue again

            if (process.browser) {//verify if is browser side
              signOut()
            }

          }).finally(() => {
            isRefreshing = false
          })
        }

        //use new Promise cause axios not accept async functions here
        return new Promise((resolve, reject) => {// takes all calls in progress that were using the old token and creates a queue to redo them with the updated token, avoiding conflict errors [...]
          // [...] remember: interceptor is called on every api call
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers['Authorization'] = `Bearer ${token}`

              resolve(api(originalConfig))//do the call again
            },
            onFailure: (error: AxiosError) => {
              reject(error)
            } 
          })
        })

      } else {
        if (process.browser) {//verify if is browser side
          signOut()
        } else {
          //exit of inteceptor, handle the error in the "catch" of the original call:
          return Promise.reject(new AuthTokenError())
        }
      }
    }
    //exit of inteceptor, handle the error in the "catch" of the original call:
    return Promise.reject(error) //any error other than 401 (unauthorized)
  })

  return api
}