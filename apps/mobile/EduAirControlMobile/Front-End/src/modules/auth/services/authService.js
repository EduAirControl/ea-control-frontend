import apiClient from '../../../shared/services/apiClient'
import storage from '../../../shared/storage/storage'

function base64UrlDecode(str) {
const normalized = str.replace(/-/g, '+').replace(/_/g, '/')
const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
return atob(padded)
}

function decodeJWT(token) {
try {
const payload = token.split('.')[1]
return JSON.parse(base64UrlDecode(payload))
} catch {
return null
}
}

const authService = {
async login(email, password) {
const data = await apiClient.post('/api/v1/auth/login', {
email,
password,
})

```
await storage.setItem('token', data.token)

const claims = decodeJWT(data.token)
const user = {
  email: claims?.sub || email,
  role: claims?.role || 'USER',
  name: email.split('@')[0],
}

await storage.setItem('user', JSON.stringify(user))
return data
```

},

async register(name, email, password, companyCode) {
const data = await apiClient.post('/api/v1/auth/register', {
name,
email,
password,
companyCode,
})

```
await storage.setItem('token', data.token)

const claims = decodeJWT(data.token)
const user = {
  email: claims?.sub || email,
  role: claims?.role || 'USER',
  name,
}

await storage.setItem('user', JSON.stringify(user))
return data
```

},

async logout() {
await storage.removeItem('token')
await storage.removeItem('user')
},

async forgotPassword(email) {
return apiClient.post('/api/v1/auth/forgot-password', { email })
},

async verifyCode(email, code) {
return apiClient.post('/api/v1/auth/verify-code', {
email,
code,
})
},

async resendCode(email) {
return apiClient.post('/api/v1/auth/resend-code', { email })
},

async resetPassword(email, code, newPassword) {
return apiClient.post('/api/v1/auth/reset-password', {
email,
code,
newPassword,
})
},

async changePassword(currentPassword, newPassword) {
return apiClient.post('/api/v1/auth/change-password', {
currentPassword,
newPassword,
})
},

getToken() {
return storage.getItem('token')
},

getUser() {
try {
return JSON.parse(storage.getItem('user'))
} catch {
return null
}
},

isAuthenticated() {
const token = storage.getItem('token')
if (!token || typeof token !== 'string') { return false }

```
const claims = decodeJWT(token)

if (!claims) { 
  storage.removeItem('token') 
  storage.removeItem('user') 
  return false 
} 
  
if ( 
  typeof claims.exp === 'number' && 
  claims.exp * 1000 <= Date.now() 
  ) { 
    storage.removeItem('token') 
    storage.removeItem('user') 
    return false 
  }

return true
```

},

isAdmin() {
if (!this.isAuthenticated()) return false

```
const role =
  this.getUser()?.role ||
  decodeJWT(this.getToken())?.role ||
  ''

return String(role).toUpperCase() === 'ADMIN'
```

},

isSuperAdmin() {
if (!this.isAuthenticated()) return false

```
const role =
  this.getUser()?.role ||
  decodeJWT(this.getToken())?.role ||
  ''

return String(role).toUpperCase() === 'SUPER_ADMIN'
```

},
}

export default authService
