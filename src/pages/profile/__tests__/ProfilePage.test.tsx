import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import ProfilePage from '../ProfilePage'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../hooks/api/useProfile', () => ({
  useUpdateProfile: vi.fn(),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useAuth } from '../../../contexts/AuthContext'
import { useUpdateProfile } from '../../../hooks/api/useProfile'
import { toast } from '../../../lib/toast'

beforeEach(() => {
  vi.clearAllMocks()
})

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  company_name: 'Test Corp',
  role: 'Manager',
  is_staff: false,
  company_id: null,
}

const mockRefreshUser = vi.fn()
const mockMutateAsync = vi.fn()

function setupMocks(mutateAsyncImpl?: () => Promise<unknown>) {
  vi.mocked(useAuth).mockReturnValue({
    user: mockUser,
    tokens: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: mockRefreshUser,
  } as never)

  vi.mocked(useUpdateProfile).mockReturnValue({
    mutateAsync: mutateAsyncImpl ?? mockMutateAsync.mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
    data: undefined,
    reset: vi.fn(),
    variables: undefined,
    status: 'idle',
    mutate: vi.fn(),
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isIdle: true,
    isPaused: false,
    submittedAt: 0,
  } as never)
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )
}

it('renders username and email pre-filled from AuthContext user', () => {
  setupMocks()
  renderPage()

  const usernameInput = screen.getByDisplayValue('testuser')
  const emailInput = screen.getByDisplayValue('test@example.com')

  expect(usernameInput).toBeInTheDocument()
  expect(emailInput).toBeInTheDocument()
  expect(screen.getByText('Test Corp')).toBeInTheDocument()
  expect(screen.getByText('Manager')).toBeInTheDocument()
})

it('submit personal info form calls updateProfile with correct payload', async () => {
  const mutateAsync = vi.fn().mockResolvedValue({ username: 'newusername', email: 'test@example.com' })
  setupMocks(() => mutateAsync())

  vi.mocked(useUpdateProfile).mockReturnValue({
    mutateAsync,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
    data: undefined,
    reset: vi.fn(),
    variables: undefined,
    status: 'idle',
    mutate: vi.fn(),
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isIdle: true,
    isPaused: false,
    submittedAt: 0,
  } as never)

  renderPage()

  const usernameInput = screen.getByDisplayValue('testuser')
  await userEvent.clear(usernameInput)
  await userEvent.type(usernameInput, 'newusername')

  const submitBtn = screen.getByRole('button', { name: /save changes/i })
  await userEvent.click(submitBtn)

  await waitFor(() => {
    expect(mutateAsync).toHaveBeenCalledWith({
      username: 'newusername',
      email: 'test@example.com',
    })
  })
  expect(mockRefreshUser).toHaveBeenCalled()
  expect(toast.success).toHaveBeenCalledWith('Profile updated')
})

it('password mismatch shows validation error without calling API', async () => {
  const mutateAsync = vi.fn()
  setupMocks()
  vi.mocked(useUpdateProfile).mockReturnValue({
    mutateAsync,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
    data: undefined,
    reset: vi.fn(),
    variables: undefined,
    status: 'idle',
    mutate: vi.fn(),
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isIdle: true,
    isPaused: false,
    submittedAt: 0,
  } as never)

  renderPage()

  const currentPw = screen.getByLabelText(/^current password$/i)
  const newPw = screen.getByLabelText(/^new password$/i)
  const confirmPw = screen.getByLabelText(/^confirm new password$/i)

  await userEvent.type(currentPw, 'currentpass')
  await userEvent.type(newPw, 'newpassword')
  await userEvent.type(confirmPw, 'differentpassword')

  const changeBtn = screen.getByRole('button', { name: /change password/i })
  await userEvent.click(changeBtn)

  await waitFor(() => {
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })
  expect(mutateAsync).not.toHaveBeenCalled()
})

it('wrong current password shows error on current_password field', async () => {
  const apiError = {
    status: 400,
    message: 'Validation failed.',
    fieldErrors: { current_password: 'Wrong password.' },
  }
  const mutateAsync = vi.fn().mockRejectedValueOnce(apiError)

  vi.mocked(useAuth).mockReturnValue({
    user: mockUser,
    tokens: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: mockRefreshUser,
  } as never)

  vi.mocked(useUpdateProfile).mockReturnValue({
    mutateAsync,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
    data: undefined,
    reset: vi.fn(),
    variables: undefined,
    status: 'idle',
    mutate: vi.fn(),
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isIdle: true,
    isPaused: false,
    submittedAt: 0,
  } as never)

  renderPage()

  const currentPw = screen.getByLabelText(/^current password$/i)
  const newPw = screen.getByLabelText(/^new password$/i)
  const confirmPw = screen.getByLabelText(/^confirm new password$/i)

  await userEvent.type(currentPw, 'wrongpass')
  await userEvent.type(newPw, 'newpassword')
  await userEvent.type(confirmPw, 'newpassword')

  const changeBtn = screen.getByRole('button', { name: /change password/i })
  await userEvent.click(changeBtn)

  await waitFor(() => {
    expect(screen.getByText('Wrong password.')).toBeInTheDocument()
  })
})

it('disables submit button while mutation is in flight (isPending)', () => {
  vi.mocked(useAuth).mockReturnValue({
    user: mockUser,
    tokens: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: mockRefreshUser,
  } as never)

  vi.mocked(useUpdateProfile).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: true,
    isError: false,
    error: null,
    isSuccess: false,
    data: undefined,
    reset: vi.fn(),
    variables: undefined,
    status: 'pending',
    mutate: vi.fn(),
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isIdle: false,
    isPaused: false,
    submittedAt: 0,
  } as never)

  renderPage()

  const saveBtn = screen.getByRole('button', { name: /saving\.\.\./i })
  const changeBtn = screen.getByRole('button', { name: /changing\.\.\./i })
  expect(saveBtn).toBeDisabled()
  expect(changeBtn).toBeDisabled()
})
