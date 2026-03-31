import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDashboardData } from './services/dashboardService.js'
import { getLiveFixtures, getMatchDetails, getUpcomingFixtures } from './services/apiFootballService.js'
import { getTeamIntel } from './services/sportsDbService.js'
import { getTrainingSummary } from './services/statsBombService.js'
import { isSupabaseAuthConfigured, signInWithEmail, signUpWithEmail } from './services/supabaseAuthService.js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = Number(process.env.PORT || 8787)
const distPath = path.resolve(__dirname, '../dist')

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/auth/health', (_req, res) => {
  res.json({ configured: isSupabaseAuthConfigured() })
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body ?? {}

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' })
      return
    }

    const result = await signUpWithEmail({ email, password })
    res.json(result)
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Unable to sign up.' })
  }
})

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body ?? {}

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' })
      return
    }

    const result = await signInWithEmail({ email, password })
    res.json(result)
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Unable to sign in.' })
  }
})

app.get('/api/dashboard', async (req, res) => {
  try {
    const dashboard = await getDashboardData({ fresh: req.query.fresh === '1' })
    res.json(dashboard)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to build dashboard data.' })
  }
})

app.get('/api/analysis', async (_req, res) => {
  try {
    const dashboard = await getDashboardData()
    res.json({
      aiAnalysis: dashboard.aiAnalysis,
      livePolls: dashboard.livePolls,
      researchDigest: dashboard.researchDigest,
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load AI analysis.' })
  }
})

app.get('/api/fixtures', async (_req, res) => {
  try {
    const matches = await getUpcomingFixtures()
    res.json({ matches })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load fixtures.' })
  }
})

app.get('/api/live', async (_req, res) => {
  try {
    const liveMatches = await getLiveFixtures()
    res.json({ liveMatches })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load live fixtures.' })
  }
})

app.get('/api/match/:fixtureId', async (req, res) => {
  try {
    const matchDetails = await getMatchDetails(req.params.fixtureId)

    if (!matchDetails) {
      res.status(404).json({ message: 'Match details were not found.' })
      return
    }

    res.json(matchDetails)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load match details.' })
  }
})

app.get('/api/team-intel', async (_req, res) => {
  try {
    const matches = await getUpcomingFixtures()
    const teamIntel = await getTeamIntel(matches)
    res.json({ teamIntel })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load team intel.' })
  }
})

app.get('/api/training-summary', async (_req, res) => {
  try {
    const trainingSummary = await getTrainingSummary()
    res.json({ trainingSummary })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load training summary.' })
  }
})

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))

  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`SmartBet AI backend listening on http://127.0.0.1:${port}`)
})