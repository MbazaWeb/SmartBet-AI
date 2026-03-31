export function getRuntimeDebugInfo() {
  return {
    deployment: {
      nodeEnv: process.env.NODE_ENV || null,
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelRegion: process.env.VERCEL_REGION || null,
      vercelUrl: process.env.VERCEL_URL || null,
      vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
      vercelGitRepoSlug: process.env.VERCEL_GIT_REPO_SLUG || null,
    },
    envPresence: {
      apiFootballKey: Boolean(process.env.API_FOOTBALL_KEY),
      footballDataKey: Boolean(process.env.FOOTBALL_DATA_API_KEY || process.env.VITE_FOOTBALL_DATA_API_KEY),
      sportsDbKey: Boolean(process.env.THE_SPORTS_DB_KEY),
      supabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  }
}