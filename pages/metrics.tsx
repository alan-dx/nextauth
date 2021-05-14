import React from "react"
import { setupApiClient } from "../services/api"
import { withSSRAuth } from "../utils/withSSRAuth"

export default function Metrics() {

  return (
    <h1>
      Métricas
    </h1>
  )
}

export const getServerSideProps = withSSRAuth(async (ctx) => {

  const apiClient = setupApiClient(ctx)//on the server side it is necessary to pass the context for the nookies to work
  const response = await apiClient.get('/me')

  return {
    props: {}
  }
}, {
  permissions: ['metrics.list3'], //what permissions allow access to this page
  roles: ['administrator']
})