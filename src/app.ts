import fastify, { type FastifyError } from 'fastify'
import { fastifyCors } from '@fastify/cors'
import jwt from '@fastify/jwt'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { fromZodError } from 'zod-validation-error'
import { ZodError } from './libs/zod'
import { AppError } from './errors/app-error'
import { env } from './libs/env'
import { authRoutes } from './http/routes/auth-routes'
import { listRoutes } from './http/routes/list-routes'

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})

app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: '1d',
  },
})

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(authRoutes)
app.register(listRoutes)

app.get('/', () => {
  return { status: 'ok' }
})

app.setErrorHandler((error: FastifyError, _request, reply) => {
  if (error.name === 'UserAlreadyExistsError') {
    return reply.status(409).send({
      message: 'User already exists',
    })
  }

  if (error.name === 'UnauthorazedError') {
    return reply.status(401).send({
      message: 'Invalid credentials',
    })
  }

  if (error.code === 'FST_ERR_VALIDATION') {
    return reply.status(400).send({
      message: 'Validation error.',
      errors: error.validation,
    })
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      message: 'Validation error.',
      errors: error,
    })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error.',
      errors: fromZodError(error.validation),
    })
  }

  if (env.NODE_ENV !== 'prod') {
    console.error(error)
  } else {
    // TODO: Here we should log to an external tool like DataDog/NewRelic/Sentry
  }

  return reply.status(500).send({ message: 'Internal server error.' })
})

export { app }
