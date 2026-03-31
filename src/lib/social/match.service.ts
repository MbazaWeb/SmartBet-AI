// src/lib/social/match.service.ts
import { supabase, handleSupabaseError, isSupabaseConfigured } from '../supabase/client'
import type { Comment, MatchThread, CommentInput } from './types'

function toFixtureKey(fixtureId: string | number): string {
  return String(fixtureId)
}

function normalizeCommentRows(rows: Array<{
  id: string
  parent_id: string | null
  author_name: string
  body: string
  created_at: string
}>): Comment[] {
  const commentsById = new Map<string, Comment>()

  rows.forEach((row) => {
    commentsById.set(row.id, {
      id: row.id,
      author: row.author_name,
      text: row.body,
      createdAt: row.created_at,
      replies: [],
    })
  })

  const rootComments: Comment[] = []

  rows.forEach((row) => {
    const normalizedComment = commentsById.get(row.id)!
    
    if (row.parent_id) {
      const parentComment = commentsById.get(row.parent_id)
      if (parentComment) {
        parentComment.replies.push(normalizedComment)
      }
    } else {
      rootComments.push(normalizedComment)
    }
  })

  return rootComments
}

export async function fetchMatchThread(
  fixtureId: string | number,
  userId?: string | null
): Promise<MatchThread> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for social persistence.')
  }

  const fixtureKey = toFixtureKey(fixtureId)

  const [likesResponse, commentsResponse] = await Promise.all([
    supabase
      .from('match_likes')
      .select('user_id', { count: 'exact', head: false })
      .eq('fixture_id', fixtureKey),
    supabase
      .from('match_comments')
      .select('id, parent_id, author_name, body, created_at')
      .eq('fixture_id', fixtureKey)
      .order('created_at', { ascending: true }),
  ])

  if (likesResponse.error) handleSupabaseError(likesResponse.error)
  if (commentsResponse.error) handleSupabaseError(commentsResponse.error)

  const likesData = likesResponse.data ?? []
  const likesCount = likesResponse.count ?? likesData.length

  return {
    likesCount,
    isLiked: userId ? likesData.some((row) => row.user_id === userId) : false,
    comments: normalizeCommentRows(commentsResponse.data ?? []),
  }
}

export async function toggleMatchLike(
  fixtureId: string | number,
  userId: string,
  shouldLike: boolean
): Promise<MatchThread> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for social persistence.')
  }

  const fixtureKey = toFixtureKey(fixtureId)

  if (shouldLike) {
    const { error } = await supabase.from('match_likes').upsert(
      { fixture_id: fixtureKey, user_id: userId },
      { onConflict: 'fixture_id,user_id', ignoreDuplicates: true }
    )
    if (error) handleSupabaseError(error)
  } else {
    const { error } = await supabase
      .from('match_likes')
      .delete()
      .eq('fixture_id', fixtureKey)
      .eq('user_id', userId)
    if (error) handleSupabaseError(error)
  }

  return fetchMatchThread(fixtureKey, userId)
}

export async function addMatchComment(input: CommentInput): Promise<MatchThread> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for social persistence.')
  }

  const { fixtureId, parentId = null, authorId, authorName, body } = input

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

  if (error) handleSupabaseError(error)

  return fetchMatchThread(fixtureId, authorId)
}