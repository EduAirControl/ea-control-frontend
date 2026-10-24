import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'
import authService from '../modules/auth/services/authService'

// Mock authService (ruta resuelta: src/modules/auth/services/authService)
vi.mock('../modules/auth/services/authService', () => ({
  default: {
    getCurrentUser: vi.fn(),
    loginWithCredentials: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
    isAuthenticated: vi.fn(),
    isAdmin: vi.fn(),
    isSuperAdmin: vi.fn(),
  },
}))

// Test component that uses auth
const TestComponent = () => {
  const { user, loading, isAuthenticated, isAdmin, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</span>
      <span data-testid="admin">{isAdmin ? 'true' : 'false'}</span>
      <span data-testid="user-email">{user?.email || 'none'}</span>
      <button data-testid="logout" type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  )
}

const mockedAuth = authService as unknown as {
  getCurrentUser: ReturnType<typeof vi.fn>
  logout: ReturnType<typeof vi.fn>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Ruta privada: AuthProvider debe hidratar el usuario en el mount.
    window.location.pathname = '/dashboard'
  })

  it('provides loading state initially', async () => {
    mockedAuth.getCurrentUser.mockResolvedValueOnce(null)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')

    // La hidratación termina fuera de act: waitFor envuelve el estado final.
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  it('provides user when authenticated', async () => {
    mockedAuth.getCurrentUser.mockResolvedValueOnce({
      id: '123',
      email: 'test@test.com',
      role: 'ADMIN',
      roles: ['ADMIN'],
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('admin')).toHaveTextContent('true')
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@test.com')
  })

  it('reloads the user when the auth event fires', async () => {
    mockedAuth.getCurrentUser.mockResolvedValueOnce({
      id: '123',
      email: 'first@test.com',
      role: 'USER',
      roles: ['USER'],
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('user-email')).toHaveTextContent('first@test.com'))

    mockedAuth.getCurrentUser.mockResolvedValueOnce({
      id: '456',
      email: 'second@test.com',
      role: 'USER',
      roles: ['USER'],
    })
    fireEvent(window, new Event('eduaircontrol:auth'))

    await waitFor(() => expect(screen.getByTestId('user-email')).toHaveTextContent('second@test.com'))
  })

  it('delegates logout to authService', async () => {
    mockedAuth.getCurrentUser.mockResolvedValueOnce({
      id: '123',
      email: 'test@test.com',
      role: 'USER',
      roles: ['USER'],
    })
    mockedAuth.logout.mockResolvedValue(undefined)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    fireEvent.click(screen.getByTestId('logout'))

    await waitFor(() => expect(mockedAuth.logout).toHaveBeenCalledTimes(1))
  })
})
