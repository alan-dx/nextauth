import { destroyCookie } from "nookies"
import React, { useContext, useEffect } from "react"
import { Can } from "../components/Can"
import { AuthContext } from "../contexts/AuthContext"
import { useCan } from "../hooks/useCan"
import { setupApiClient } from "../services/api"
import { api } from "../services/apiClient"
import { withSSRAuth } from "../utils/withSSRAuth"

export default function Dashboard() {
  const { user, signOut } = useContext(AuthContext)

  const useCanSeeMetrics = useCan({
    permissions: ['metrics.list']
  })

  useEffect(() => {
    api.get('/me')
      .then(response => console.log(response))
      .catch(err => console.log(err))
  }, [])

  return (
    <>
      <h1>
        Dashboard: {user?.email}
      </h1>

      <button onClick={signOut}>Sign out</button>

      <Can permissions={['metrics.list']}>
        <div>
          Métricas
        </div>
      </Can>
    </>
  )
}

export const getServerSideProps = withSSRAuth(async (ctx) => {

  const apiClient = setupApiClient(ctx)//on the server side it is necessary to pass the context for the nookies to work
  const response = await apiClient.get('/me')

  console.log(response.data)

  return {
    props: {}
  }
})