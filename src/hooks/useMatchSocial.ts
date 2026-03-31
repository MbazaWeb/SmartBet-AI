// src/hooks/useMatchSocial.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMatchThread, toggleMatchLike, addMatchComment } from '../lib/social/match.service'
import type { MatchThread, CommentInput } from '../lib/social/types'

export const matchThreadKeys = {
  all: ['match-thread'] as const,
  detail: (fixtureId: string | number, userId?: string | null) =>
    [...matchThreadKeys.all, fixtureId, userId] as const,
}

export function useMatchThread(fixtureId: string | number, userId?: string | null) {
  return useQuery({
    queryKey: matchThreadKeys.detail(fixtureId, userId),
    queryFn: () => fetchMatchThread(fixtureId, userId),
    enabled: Boolean(fixtureId),
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors or 404s
      if (error instanceof Error && error.message.includes('Sign in')) return false
      return failureCount < 2
    },
  })
}

export function useToggleLikeMutation(fixtureId: string | number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, shouldLike }: { userId: string; shouldLike: boolean }) =>
      toggleMatchLike(fixtureId, userId, shouldLike),
    onMutate: async ({ userId, shouldLike }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: matchThreadKeys.detail(fixtureId, userId) })

      // Snapshot previous value
      const previousThread = queryClient.getQueryData<MatchThread>(
        matchThreadKeys.detail(fixtureId, userId)
      )

      // Optimistically update
      if (previousThread) {
        queryClient.setQueryData<MatchThread>(matchThreadKeys.detail(fixtureId, userId), {
          ...previousThread,
          likesCount: shouldLike
            ? previousThread.likesCount + 1
            : Math.max(0, previousThread.likesCount - 1),
          isLiked: shouldLike,
        })
      }

      return { previousThread, userId }
    },
    onError: (err, variables, context) => {
      if (context?.previousThread && context.userId) {
        queryClient.setQueryData(
          matchThreadKeys.detail(fixtureId, context.userId),
          context.previousThread
        )
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: matchThreadKeys.detail(fixtureId, variables.userId) })
    },
  })
}

export function useAddCommentMutation(fixtureId: string | number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<CommentInput, 'fixtureId'>) =>
      addMatchComment({ ...input, fixtureId }),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        matchThreadKeys.detail(fixtureId, variables.authorId),
        data
      )
      queryClient.invalidateQueries({ queryKey: matchThreadKeys.detail(fixtureId) })
    },
  })
}