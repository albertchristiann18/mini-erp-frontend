import { useMutation } from '@tanstack/react-query'
import { updateProfile } from '../../api/auth'
import type { UpdateProfilePayload } from '../../api/auth'

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
  })
