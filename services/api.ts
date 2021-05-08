import axios, { AxiosError } from 'axios'
import { parseCookies, setCookie } from 'nookies'

let cookies = parseCookies()
let isRefreshing = false
let failedRequestsQueue = []

// only called the first time the application is loaded, so we need uptade it every change **
export const api = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
    Authorization: `Bearer ${cookies['nextauth.token']}`
  }
})

//AULA: REALIZANDO REFRESH DO TOKEN...; CHAPTER IV

// can be called many times
api.interceptors.response.use(response => {
  //success case
  return response
}, (error: AxiosError) => {
  //error case
  if (error.response.status === 401) {
    if (error.response.data?.code === 'token.expired') { // refresh token
      cookies = parseCookies() //get updated cookies on every call

      const {'nextauth.refreshToken': refreshToken} = cookies
      const originalConfig = error.config// takes all the configuration of each request that gave an error (remember: interceptor will be called many times)

      if (!isRefreshing) { //prevents other calls in progress from also attempting to update the token
        isRefreshing = true

        api.post('/refresh', {//refresh token
          refreshToken
        }).then(response => {
          const { token } = response.data
          
          setCookie(undefined, 'nextauth.token', token, { //set the new Token
            nextAge: 60 * 60 * 24 * 30,
            path: '/'
          })
          
          setCookie(undefined, 'nextauth.refreshToken', response.data.refreshToken, { // set the new refreshToken
            nextAge: 60 * 60 * 24 * 30,
            path: '/'
          })
  
          api.defaults.headers['Authorization'] = `Bearer ${token}` // update **

          failedRequestsQueue.forEach(request => request.onSuccess(token)) // call each request on the queue again
          failedRequestsQueue = [] // clean the queue again
        }).catch(error => {
          failedRequestsQueue.forEach(request => request.onFailure(error)) // in case error
          failedRequestsQueue = [] // clean the queue again
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
      // sign up user
    }
  }
})