import { isSupabaseConfigured, supabase } from './supabase'

function toReadableError(error) {
  if (error?.code === 'PGRST205') {
    return new Error('Supabase cannot see the social tables yet. Run supabase/social-schema.sql in the SQL editor, then refresh the schema cache.')
  }

  return error
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for social persistence.')
  }
}

function toFixtureKey(fixtureId) {
  return String(fixtureId)
}

function normalizeCommentRows(rows) {
  const commentsById = new Map()

  rows.forEach((row) => {
    commentsById.set(row.id, {
      id: row.id,
      author: row.author_name,
      text: row.body,
      createdAt: row.created_at,
      replies: [],
    })
  })

  const rootComments = []

  rows.forEach((row) => {
    const normalizedComment = commentsById.get(row.id)

    if (row.parent_id) {
      const parentComment = commentsById.get(row.parent_id)

      if (parentComment) {
        parentComment.replies.push(normalizedComment)
      }

      return
    }

    rootComments.push(normalizedComment)
  })

  return rootComments
}

export async function fetchMatchThread(fixtureId, userId) {
  requireSupabase()

  const fixtureKey = toFixtureKey(fixtureId)
  const [likesResponse, commentsResponse] = await Promise.all([
    supabase
      .from('match_likes')
      .select('user_id', { count: 'exact' })
      .eq('fixture_id', fixtureKey),
    supabase
      .from('match_comments')
      .select('id, parent_id, author_name, body, created_at')
      .eq('fixture_id', fixtureKey)
      .order('created_at', { ascending: true }),
  ])

  if (likesResponse.error) {
    throw toReadableError(likesResponse.error)
  }

  if (commentsResponse.error) {
    throw toReadableError(commentsResponse.error)
  }

  const likesData = likesResponse.data ?? []

  return {
    likesCount: likesResponse.count ?? likesData.length,
    isLiked: userId ? likesData.some((row) => row.user_id === userId) : false,
    comments: normalizeCommentRows(commentsResponse.data ?? []),
  }
}

export async function toggleMatchLike(fixtureId, userId, shouldLike) {
  requireSupabase()

  if (!userId) {
    throw new Error('Sign in to like a prediction.')
  }

  const fixtureKey = toFixtureKey(fixtureId)

  if (shouldLike) {
    const { error } = await supabase.from('match_likes').upsert(
      {
        fixture_id: fixtureKey,
        user_id: userId,
      },
      {
        onConflict: 'fixture_id,user_id',
        ignoreDuplicates: true,
      },
    )

    if (error) {
      throw toReadableError(error)
    }
  } else {
    const { error } = await supabase
      .from('match_likes')
      .delete()
      .eq('fixture_id', fixtureKey)
      .eq('user_id', userId)

    if (error) {
      throw toReadableError(error)
    }
  }

  return fetchMatchThread(fixtureKey, userId)
}

export async function addMatchComment({ fixtureId, parentId = null, authorId, authorName, body }) {
  requireSupabase()

  if (!authorId) {
    throw new Error('Sign in to comment on a prediction.')
  }

  const trimmedBody = body.trim()

  if (!trimmedBody) {
    throw new Error('Comment cannot be empty.')
  }

  const { error } = await supabase.from('match_comments').insert({
    fixture_id: toFixtureKey(fixtureId),
    parent_id: parentId,
    author_id: authorId,
    author_name: authorName,
    body: trimmedBody,
  })

  if (error) {
    throw toReadableError(error)
  }

  return fetchMatchThread(fixtureId, authorId)
}