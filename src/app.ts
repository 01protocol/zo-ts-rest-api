import compression from 'compression'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import hpp from 'hpp'
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import {NODE_ENV, PORT} from '@config'
import {Routes} from '@interfaces/routes.interface'
import errorMiddleware from '@middlewares/error.middleware'

class App {
    public app: express.Application
    public env: string
    public port: string | number

    constructor(routes: Routes[]) {
        this.app = express()
        this.env = NODE_ENV || 'development'
        this.port = PORT || 4000

        this.initializeMiddlewares()
        this.initializeRoutes(routes)
        this.initializeSwagger()
        this.initializeErrorHandling()
    }

    public listen() {
        this.app.listen(this.port, () => {
            console.log(`=================================`)
            console.log(`======= ENV: ${this.env} =======`)
            console.log(`🚀 App listening on the port ${this.port}`)
            console.log(`=================================`)
            console.log(`Press CONTROL/COMMAND+C to exit`)
            console.log(`=================================`)
        })
    }

    public getServer() {
        return this.app
    }

    private initializeMiddlewares() {
        this.app.use(hpp())
        this.app.use(helmet())
        this.app.use(compression())
        this.app.use(express.json())
        this.app.use(express.urlencoded({extended: true}))
        this.app.use(cookieParser())
    }

    private initializeRoutes(routes: Routes[]) {
        routes.forEach((route) => {
            this.app.use('/', route.router)
        })
    }

    private initializeSwagger() {
        const options = {
            swaggerDefinition: {
                info: {
                    title: 'REST API',
                    version: '1.0.0',
                    description: 'Example docs'
                }
            },
            apis: ['swagger.yaml']
        }

        const specs = swaggerJSDoc(options)
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))
    }

    private initializeErrorHandling() {
        this.app.use(errorMiddleware)
    }
}

export default App
