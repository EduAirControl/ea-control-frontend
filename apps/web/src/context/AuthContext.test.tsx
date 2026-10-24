import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../../context/useAuth'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock authService
vi.mock('../../modules/auth/services/authService', () => ({
  default: {
    getCurrentUser: vi.fn(),
    loginWithCredentials: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
    isAuthenticated: vi.fn(),
    isAdmin: vi.fn(),
    isSuperAdmin: vi.fn(),
  },
})

const { default: authService } = await import('../../modules/auth/services/authService')

// Test component that uses auth
const TestComponent = () => {
  const { user, loading, isAuthenticated, isAdmin } = useAuth()
  return (
    <div>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</span>
      <span data-testid="admin">{isAdmin ? 'true' : 'false'}</span>
      <span data-testid="user-email">{user?.email || 'none'}</span>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('provides loading state initially', async () => {
    const { default: authService } = await import('../../../modules/auth/services/authService')
    authService.getCurrentUser.mockResolvedValueOnce(null)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  it('provides user when authenticated', async () => {
    const mockUser = {
      id: '123',
      email: 'test@test.com',
      role: 'ADMIN',
      roles: ['ADMIN'],
    }
    const { default: authService } = await import('../../modules/auth/services/authService')
    authService.getCurrentUser.mockResolvedValueOnce({
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

    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('admin')).toHaveTextContent('true')
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@test.com')
  })

  it('handles logout', async () => {
    const mockUser = {
      id: '123',
      email: 'test@test.com',
      role: 'USER',
      roles: ['USER'],
    }
    const { default: authService } = await import('../../modules/auth/services/authService')
    authService.getCurrentUser.mockResolvedValueOnce({
      id: '123',
      email: 'test@test.com',
      role: 'USER',
      roles: ['USER'],
    })
    authService.logout.mockResolvedValueOnce(undefined)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for user to load
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')

    // Logout
    authService.logout.mockResolvedValueOnce(undefined)
    // Simulate logout event
    window.dispatchEvent(new Event('eduaircontrol:auth'))

    // After logout, user should be null
    expect(authService.logout).toHaveBeenCalled()
  })
})