import { useForm } from 'react-hook-form'
import type { UseFormReturn, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { toast } from '../../lib/toast'
import { useUpdateProfile } from '../../hooks/api/useProfile'
import { applyApiErrors } from '../../lib/formHelpers'
import type { ApiError } from '../../lib/errors'

function reportMutationError<T extends FieldValues>(form: UseFormReturn<T>, err: unknown) {
  const error = err as ApiError
  applyApiErrors(form, error)
  if (!error.fieldErrors) toast.error(error.message)
}

const profileSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
})
type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type PasswordFormValues = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { mutateAsync, isPending } = useUpdateProfile()

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: { username: user?.username ?? '', email: user?.email ?? '' },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    try {
      await mutateAsync({ username: values.username, email: values.email })
      await refreshUser()
      toast.success('Profile updated')
    } catch (err) {
      reportMutationError(profileForm, err)
    }
  }

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      })
      toast.success('Password changed')
      passwordForm.reset({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      reportMutationError(passwordForm, err)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account information and password.
        </p>
      </div>

      <div className="flex gap-6 text-sm text-muted-foreground">
        {user.company_name && (
          <div>
            <span className="font-medium text-foreground">Company:</span> {user.company_name}
          </div>
        )}
        <div>
          <span className="font-medium text-foreground">Role:</span> {user.role ?? '—'}
        </div>
      </div>

      <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Personal Info</h2>
        <div className="space-y-1">
          <Label htmlFor="username">Username</Label>
          <Input id="username" {...profileForm.register('username')} />
          {profileForm.formState.errors.username && (
            <p className="text-xs text-red-500">{profileForm.formState.errors.username.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...profileForm.register('email')} />
          {profileForm.formState.errors.email && (
            <p className="text-xs text-red-500">{profileForm.formState.errors.email.message}</p>
          )}
        </div>
        <Button type="submit" disabled={profileForm.formState.isSubmitting || isPending}>
          {profileForm.formState.isSubmitting || isPending ? 'Saving...' : 'Save changes'}
        </Button>
      </form>

      <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
        <div className="space-y-1">
          <Label htmlFor="current_password">Current Password</Label>
          <Input id="current_password" type="password" {...passwordForm.register('current_password')} />
          {passwordForm.formState.errors.current_password && (
            <p className="text-xs text-red-500">{passwordForm.formState.errors.current_password.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="new_password">New Password</Label>
          <Input id="new_password" type="password" {...passwordForm.register('new_password')} />
          {passwordForm.formState.errors.new_password && (
            <p className="text-xs text-red-500">{passwordForm.formState.errors.new_password.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm_password">Confirm New Password</Label>
          <Input id="confirm_password" type="password" {...passwordForm.register('confirm_password')} />
          {passwordForm.formState.errors.confirm_password && (
            <p className="text-xs text-red-500">{passwordForm.formState.errors.confirm_password.message}</p>
          )}
        </div>
        <Button type="submit" disabled={passwordForm.formState.isSubmitting || isPending}>
          {passwordForm.formState.isSubmitting || isPending ? 'Changing...' : 'Change password'}
        </Button>
      </form>
    </div>
  )
}
