import { config } from "dotenv"

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` })

export const {
	NODE_ENV,
	DEPLOY_MODE,
	PORT,
	LOG_FORMAT,
	LOG_DIR,
	SECRET_KEY,
	RPC_URL,
	SKIP_PREFLIGHT,
	COMMITMENT,
} = process.env
