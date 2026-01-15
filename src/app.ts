import fastify, { type FastifyError } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import redis from '@fastify/redis'
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

const app = fastify({
  trustProxy: true,
}).withTypeProvider<ZodTypeProvider>()

app.register(redis, {
  host: '127.0.0.1',
  port: 6379,
})

app.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})

app.register(rateLimit, {
  max: 100, // Máximo de 100 requisições
  timeWindow: '1 minute', // Por janela de 1 minuto
  cache: 10000, // Cache para 10.000 IPs diferentes
  allowList: ['127.0.0.1'], // IPs em whitelist (localhost para desenvolvimento)
  redis: env.NODE_ENV !== 'prod' ? undefined : app.redis, // Usar memória local (para produção, considere Redis)
  nameSpace: 'rate-limit-', // Namespace para as chaves
  continueExceeding: true, // Continua contando mesmo após exceder
  skipOnError: false, // Não pula rate limit em caso de erro
  ban: undefined, // Não bane IPs permanentemente
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Você excedeu o limite de ${context.max} requisições por ${context.after}. Tente novamente mais tarde.`,
      retryAfter: context.ttl,
    }
  },
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
