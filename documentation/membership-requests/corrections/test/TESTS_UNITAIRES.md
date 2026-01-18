# Tests Unitaires - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document liste tous les cas de tests unitaires pour la fonctionnalité de correction.

**Objectif de couverture : 80% minimum**

**✅ Tous les composants et services du feedback P0 sont couverts**

---

## 🧪 1. Utilitaires

### 1.1 SecurityCodeUtils

**Fichier :** `src/utils/securityCodeUtils.ts`

#### `generateSecurityCode()`

**Tests :**
```typescript
describe('generateSecurityCode', () => {
  it('should generate a 6-digit code', () => {
    const code = generateSecurityCode()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('should generate different codes on each call', () => {
    const codes = Array.from({ length: 100 }, () => generateSecurityCode())
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBeGreaterThan(90) // Probabilité très élevée
  })

  it('should generate codes between 100000 and 999999', () => {
    const code = generateSecurityCode()
    const numCode = parseInt(code, 10)
    expect(numCode).toBeGreaterThanOrEqual(100000)
    expect(numCode).toBeLessThanOrEqual(999999)
  })
})
```

#### `calculateCodeExpiry(hours: number)`

**Tests :**
```typescript
describe('calculateCodeExpiry', () => {
  it('should calculate expiry date 48 hours from now', () => {
    const now = new Date()
    const expiry = calculateCodeExpiry(48)
    const diff = expiry.getTime() - now.getTime()
    const hours = diff / (1000 * 60 * 60)
    expect(hours).toBeCloseTo(48, 0)
  })

  it('should calculate expiry date for custom hours', () => {
    const now = new Date()
    const expiry = calculateCodeExpiry(24)
    const diff = expiry.getTime() - now.getTime()
    const hours = diff / (1000 * 60 * 60)
    expect(hours).toBeCloseTo(24, 0)
  })
})
```

#### `isSecurityCodeValid(info: SecurityCodeInfo)`

**Tests :**
```typescript
describe('isSecurityCodeValid', () => {
  it('should return true for valid code (not used, not expired)', () => {
    const info = {
      code: '123456',
      used: false,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // +24h
    }
    expect(isSecurityCodeValid(info)).toBe(true)
  })

  it('should return false for used code', () => {
    const info = {
      code: '123456',
      used: true,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
    expect(isSecurityCodeValid(info)).toBe(false)
  })

  it('should return false for expired code', () => {
    const info = {
      code: '123456',
      used: false,
      expiry: new Date(Date.now() - 1000) // Expiré
    }
    expect(isSecurityCodeValid(info)).toBe(false)
  })

  it('should return false for code expiring in less than 1 minute', () => {
    const info = {
      code: '123456',
      used: false,
      expiry: new Date(Date.now() + 30 * 1000) // +30s
    }
    expect(isSecurityCodeValid(info)).toBe(false)
  })
})
```

---

### 1.2 WhatsAppUrlUtils

**Fichier :** `src/utils/whatsAppUrlUtils.ts`

#### `normalizePhoneNumber(phoneNum: string)`

**Tests :**
```typescript
describe('normalizePhoneNumber', () => {
  it('should normalize phone number with spaces', () => {
    expect(normalizePhoneNumber('+241 65 67 17 34')).toBe('+24165671734')
  })

  it('should normalize phone number with dashes', () => {
    expect(normalizePhoneNumber('+241-65-67-17-34')).toBe('+24165671734')
  })

  it('should keep valid phone number as is', () => {
    expect(normalizePhoneNumber('+24165671734')).toBe('+24165671734')
  })

  it('should handle phone number without country code', () => {
    expect(normalizePhoneNumber('65671734')).toBe('65671734')
  })
})
```

#### `generateWhatsAppUrl(phoneNumber: string, message: string)`

**Tests :**
```typescript
describe('generateWhatsAppUrl', () => {
  it('should generate valid WhatsApp URL', () => {
    const url = generateWhatsAppUrl('+24165671734', 'Hello')
    expect(url).toContain('https://wa.me/')
    expect(url).toContain('24165671734')
    expect(url).toContain('text=')
  })

  it('should encode message correctly', () => {
    const message = 'Hello\nWorld'
    const url = generateWhatsAppUrl('+24165671734', message)
    expect(url).toContain(encodeURIComponent(message))
  })

  it('should normalize phone number before generating URL', () => {
    const url = generateWhatsAppUrl('+241 65 67 17 34', 'Hello')
    expect(url).toContain('24165671734')
    expect(url).not.toContain(' ')
  })
})
```

---

### 1.3 Formatage

**Fichier :** `src/utils/correctionUtils.ts`

#### `formatSecurityCode(code: string)`

**Tests :**
```typescript
describe('formatSecurityCode', () => {
  it('should format 6-digit code as AB12-CD34', () => {
    expect(formatSecurityCode('123456')).toBe('12-34-56')
  })

  it('should return code as is if not 6 digits', () => {
    expect(formatSecurityCode('12345')).toBe('12345')
    expect(formatSecurityCode('1234567')).toBe('1234567')
  })

  it('should handle empty string', () => {
    expect(formatSecurityCode('')).toBe('')
  })
})
```

#### `getTimeRemaining(expiryDate: Date)`

**Tests :**
```typescript
describe('getTimeRemaining', () => {
  it('should calculate time remaining correctly', () => {
    const expiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000) // +2j 13h
    const remaining = getTimeRemaining(expiry)
    expect(remaining).toBe('2j 13h')
  })

  it('should handle expired date', () => {
    const expiry = new Date(Date.now() - 1000)
    const remaining = getTimeRemaining(expiry)
    expect(remaining).toBe('0j 0h')
  })

  it('should handle date with only hours', () => {
    const expiry = new Date(Date.now() + 5 * 60 * 60 * 1000) // +5h
    const remaining = getTimeRemaining(expiry)
    expect(remaining).toBe('0j 5h')
  })
})
```

---

## 🧪 2. Composants UI

### 2.1 CorrectionsModalV2

**Fichier :** `src/domains/memberships/components/modals/CorrectionsModalV2.tsx`

**Tests :**
```typescript
describe('CorrectionsModalV2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    requestId: 'test-request-id',
    memberName: 'Jean Dupont',
    isLoading: false,
  }

  it('should render modal when open', () => {
    render(<CorrectionsModalV2 {...defaultProps} />)
    expect(screen.getByTestId('corrections-modal')).toBeInTheDocument()
  })

  it('should not render modal when closed', () => {
    render(<CorrectionsModalV2 {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('corrections-modal')).not.toBeInTheDocument()
  })

  it('should display member name in description', () => {
    render(<CorrectionsModalV2 {...defaultProps} />)
    expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument()
  })

  it('should disable submit button when textarea is empty', () => {
    render(<CorrectionsModalV2 {...defaultProps} />)
    const submitButton = screen.getByTestId('corrections-modal-submit-button')
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit button when corrections are entered', async () => {
    render(<CorrectionsModalV2 {...defaultProps} />)
    const textarea = screen.getByTestId('corrections-modal-textarea')
    await userEvent.type(textarea, 'Photo floue')
    
    const submitButton = screen.getByTestId('corrections-modal-submit-button')
    expect(submitButton).not.toBeDisabled()
  })

  it('should update counter when corrections are entered', async () => {
    render(<CorrectionsModalV2 {...defaultProps} />)
    const textarea = screen.getByTestId('corrections-modal-textarea')
    
    await userEvent.type(textarea, 'Photo floue\nAdresse incomplète')
    
    expect(screen.getByTestId('corrections-modal-counter')).toHaveTextContent('2 correction(s)')
  })

  it('should call onConfirm with corrections when submitted', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ securityCode: '123456' })
    render(<CorrectionsModalV2 {...defaultProps} onConfirm={onConfirm} />)
    
    const textarea = screen.getByTestId('corrections-modal-textarea')
    await userEvent.type(textarea, 'Photo floue')
    
    const submitButton = screen.getByTestId('corrections-modal-submit-button')
    await userEvent.click(submitButton)
    
    expect(onConfirm).toHaveBeenCalledWith({
      corrections: ['Photo floue'],
      selectedPhoneIndex: 0,
    })
  })

  it('should show loading state when isLoading is true', () => {
    render(<CorrectionsModalV2 {...defaultProps} isLoading={true} />)
    const submitButton = screen.getByTestId('corrections-modal-submit-button')
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/Envoi en cours/)).toBeInTheDocument()
  })

  it('should call onClose when cancel button is clicked', async () => {
    const onClose = vi.fn()
    render(<CorrectionsModalV2 {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByTestId('corrections-modal-cancel-button')
    await userEvent.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('should reset textarea when modal is closed', async () => {
    const { rerender } = render(<CorrectionsModalV2 {...defaultProps} />)
    const textarea = screen.getByTestId('corrections-modal-textarea')
    
    await userEvent.type(textarea, 'Photo floue')
    expect(textarea).toHaveValue('Photo floue')
    
    rerender(<CorrectionsModalV2 {...defaultProps} isOpen={false} />)
    rerender(<CorrectionsModalV2 {...defaultProps} isOpen={true} />)
    
    expect(textarea).toHaveValue('')
  })
})
```

---

### 2.2 SecurityCodeFormV2

**Fichier :** `src/domains/auth/registration/components/SecurityCodeFormV2.tsx`

**Tests :**
```typescript
describe('SecurityCodeFormV2', () => {
  const defaultProps = {
    onVerify: vi.fn(),
    isLoading: false,
    error: null,
  }

  it('should render form with 6 inputs', () => {
    render(<SecurityCodeFormV2 {...defaultProps} />)
    expect(screen.getByTestId('security-code-input-0')).toBeInTheDocument()
    expect(screen.getByTestId('security-code-input-5')).toBeInTheDocument()
  })

  it('should disable verify button when code is incomplete', async () => {
    render(<SecurityCodeFormV2 {...defaultProps} />)
    const verifyButton = screen.getByTestId('security-code-form-verify-button')
    expect(verifyButton).toBeDisabled()
    
    const input0 = screen.getByTestId('security-code-input-0')
    await userEvent.type(input0, '1')
    expect(verifyButton).toBeDisabled()
  })

  it('should enable verify button when code is complete', async () => {
    render(<SecurityCodeFormV2 {...defaultProps} />)
    
    for (let i = 0; i < 6; i++) {
      const input = screen.getByTestId(`security-code-input-${i}`)
      await userEvent.type(input, String(i))
    }
    
    const verifyButton = screen.getByTestId('security-code-form-verify-button')
    expect(verifyButton).not.toBeDisabled()
  })

  it('should auto-advance to next input when digit is entered', async () => {
    render(<SecurityCodeFormV2 {...defaultProps} />)
    const input0 = screen.getByTestId('security-code-input-0')
    const input1 = screen.getByTestId('security-code-input-1')
    
    await userEvent.type(input0, '1')
    expect(input1).toHaveFocus()
  })

  it('should only accept numeric digits', async () => {
    render(<SecurityCodeFormV2 {...defaultProps} />)
    const input0 = screen.getByTestId('security-code-input-0')
    
    await userEvent.type(input0, 'a')
    expect(input0).toHaveValue('')
    
    await userEvent.type(input0, '1')
    expect(input0).toHaveValue('1')
  })

  it('should handle paste of 6 digits', async () => {
    render(<SecurityCodeFormV2 {...defaultProps} />)
    const input0 = screen.getByTestId('security-code-input-0')
    
    await userEvent.click(input0)
    await userEvent.paste('123456')
    
    expect(input0).toHaveValue('1')
    expect(screen.getByTestId('security-code-input-5')).toHaveValue('6')
  })

  it('should call onVerify with code when verify button is clicked', async () => {
    const onVerify = vi.fn().mockResolvedValue(true)
    render(<SecurityCodeFormV2 {...defaultProps} onVerify={onVerify} />)
    
    for (let i = 0; i < 6; i++) {
      const input = screen.getByTestId(`security-code-input-${i}`)
      await userEvent.type(input, String(i))
    }
    
    const verifyButton = screen.getByTestId('security-code-form-verify-button')
    await userEvent.click(verifyButton)
    
    expect(onVerify).toHaveBeenCalledWith('012345')
  })

  it('should display error message when error is provided', () => {
    render(<SecurityCodeFormV2 {...defaultProps} error="Code incorrect" />)
    expect(screen.getByTestId('security-code-form-error')).toBeInTheDocument()
    expect(screen.getByText('Code incorrect')).toBeInTheDocument()
  })

  it('should show loading state when isLoading is true', () => {
    render(<SecurityCodeFormV2 {...defaultProps} isLoading={true} />)
    const verifyButton = screen.getByTestId('security-code-form-verify-button')
    expect(verifyButton).toBeDisabled()
    expect(screen.getByText(/Vérification/)).toBeInTheDocument()
  })
})
```

---

### 2.3 CorrectionBannerV2

**Fichier :** `src/domains/memberships/components/shared/CorrectionBannerV2.tsx`

**Tests :**
```typescript
describe('CorrectionBannerV2', () => {
  it('should not render when reviewNote is empty', () => {
    render(<CorrectionBannerV2 reviewNote="" />)
    expect(screen.queryByTestId('correction-banner')).not.toBeInTheDocument()
  })

  it('should render banner with corrections', () => {
    const reviewNote = 'Photo floue\nAdresse incomplète'
    render(<CorrectionBannerV2 reviewNote={reviewNote} />)
    
    expect(screen.getByTestId('correction-banner')).toBeInTheDocument()
    expect(screen.getByText('Photo floue')).toBeInTheDocument()
    expect(screen.getByText('Adresse incomplète')).toBeInTheDocument()
  })

  it('should display each correction as a list item', () => {
    const reviewNote = 'Photo floue\nAdresse incomplète\nSignature manquante'
    render(<CorrectionBannerV2 reviewNote={reviewNote} />)
    
    expect(screen.getByTestId('correction-banner-item-0')).toHaveTextContent('Photo floue')
    expect(screen.getByTestId('correction-banner-item-1')).toHaveTextContent('Adresse incomplète')
    expect(screen.getByTestId('correction-banner-item-2')).toHaveTextContent('Signature manquante')
  })

  it('should filter empty lines', () => {
    const reviewNote = 'Photo floue\n\nAdresse incomplète\n  \nSignature manquante'
    render(<CorrectionBannerV2 reviewNote={reviewNote} />)
    
    const items = screen.getAllByTestId(/correction-banner-item-/)
    expect(items).toHaveLength(3)
  })
})
```

---

## 🧪 3. Services

### 3.1 MembershipServiceV2.requestCorrections()

**Fichier :** `src/domains/memberships/services/MembershipServiceV2.ts`

**Tests :**
```typescript
describe('MembershipServiceV2.requestCorrections', () => {
  let service: MembershipServiceV2
  let mockRepository: jest.Mocked<MembershipRepositoryV2>
  let mockAdminRepository: jest.Mocked<AdminRepository>

  beforeEach(() => {
    mockRepository = {
      getById: vi.fn(),
      updateStatus: vi.fn(),
    } as any
    
    mockAdminRepository = {
      getAdminById: vi.fn(),
    } as any
    
    service = MembershipServiceV2.getInstance()
    // Inject mocks
  })

  it('should throw error if corrections array is empty', async () => {
    await expect(
      service.requestCorrections({
        requestId: 'test-id',
        adminId: 'admin-id',
        corrections: [],
        selectedPhoneIndex: 0,
      })
    ).rejects.toThrow('Au moins une correction requise')
  })

  it('should throw error if request not found', async () => {
    mockRepository.getById.mockResolvedValue(null)
    
    await expect(
      service.requestCorrections({
        requestId: 'non-existent',
        adminId: 'admin-id',
        corrections: ['Photo floue'],
        selectedPhoneIndex: 0,
      })
    ).rejects.toThrow('Demande introuvable')
  })

  it('should generate security code and expiry date', async () => {
    const mockRequest = { id: 'test-id', status: 'pending' } as MembershipRequest
    mockRepository.getById.mockResolvedValue(mockRequest)
    mockRepository.updateStatus.mockResolvedValue(true)
    mockAdminRepository.getAdminById.mockResolvedValue({
      id: 'admin-id',
      firstName: 'Admin',
      lastName: 'Test',
    } as Admin)
    
    const result = await service.requestCorrections({
      requestId: 'test-id',
      adminId: 'admin-id',
      corrections: ['Photo floue'],
      selectedPhoneIndex: 0,
    })
    
    expect(result.securityCode).toMatch(/^\d{6}$/)
    expect(result.securityCodeExpiry).toBeInstanceOf(Date)
    expect(result.securityCodeExpiry.getTime()).toBeGreaterThan(Date.now())
  })

  it('should update request status to under_review', async () => {
    const mockRequest = { id: 'test-id', status: 'pending' } as MembershipRequest
    mockRepository.getById.mockResolvedValue(mockRequest)
    mockRepository.updateStatus.mockResolvedValue(true)
    mockAdminRepository.getAdminById.mockResolvedValue({
      id: 'admin-id',
      firstName: 'Admin',
      lastName: 'Test',
    } as Admin)
    
    await service.requestCorrections({
      requestId: 'test-id',
      adminId: 'admin-id',
      corrections: ['Photo floue'],
      selectedPhoneIndex: 0,
    })
    
    expect(mockRepository.updateStatus).toHaveBeenCalledWith(
      'test-id',
      'under_review',
      expect.objectContaining({
        reviewNote: 'Photo floue',
        securityCodeUsed: false,
        processedBy: 'admin-id',
      })
    )
  })

  it('should generate WhatsApp URL if phone number available', async () => {
    const mockRequest = {
      id: 'test-id',
      status: 'pending',
      identity: {
        contacts: ['+24165671734'],
        firstName: 'Jean',
      },
    } as MembershipRequest
    
    mockRepository.getById.mockResolvedValue(mockRequest)
    mockRepository.updateStatus.mockResolvedValue(true)
    mockAdminRepository.getAdminById.mockResolvedValue({
      id: 'admin-id',
      firstName: 'Admin',
      lastName: 'Test',
    } as Admin)
    
    const result = await service.requestCorrections({
      requestId: 'test-id',
      adminId: 'admin-id',
      corrections: ['Photo floue'],
      selectedPhoneIndex: 0,
    })
    
    expect(result.whatsAppUrl).toBeDefined()
    expect(result.whatsAppUrl).toContain('wa.me')
    expect(result.whatsAppUrl).toContain('24165671734')
  })
})
```

---

---

### 2.4 SendWhatsAppModalV2

**Fichier :** `src/domains/memberships/components/modals/SendWhatsAppModalV2.tsx`

**Tests :**
```typescript
describe('SendWhatsAppModalV2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSend: vi.fn(),
    phoneNumbers: ['+24165671734', '+24107123456'],
    memberName: 'Jean Dupont',
    correctionLink: '/register?requestId=test-id',
    securityCode: '123456',
    expiryDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    isLoading: false,
  }

  it('should render modal when open', () => {
    render(<SendWhatsAppModalV2 {...defaultProps} />)
    expect(screen.getByTestId('whatsapp-modal')).toBeInTheDocument()
  })

  it('should display phone selector when multiple numbers', () => {
    render(<SendWhatsAppModalV2 {...defaultProps} />)
    expect(screen.getByTestId('whatsapp-modal-phone-select')).toBeInTheDocument()
  })

  it('should display single phone when only one number', () => {
    render(<SendWhatsAppModalV2 {...defaultProps} phoneNumbers={['+24165671734']} />)
    expect(screen.getByTestId('whatsapp-modal-single-phone')).toBeInTheDocument()
    expect(screen.queryByTestId('whatsapp-modal-phone-select')).not.toBeInTheDocument()
  })

  it('should call onSend with selected phone index', async () => {
    const onSend = vi.fn()
    render(<SendWhatsAppModalV2 {...defaultProps} onSend={onSend} />)
    
    const sendButton = screen.getByTestId('whatsapp-modal-send-button')
    await userEvent.click(sendButton)
    
    expect(onSend).toHaveBeenCalledWith(0) // Premier numéro par défaut
  })

  it('should update selected phone when dropdown changes', async () => {
    const onSend = vi.fn()
    render(<SendWhatsAppModalV2 {...defaultProps} onSend={onSend} />)
    
    const selectTrigger = screen.getByTestId('whatsapp-modal-phone-select-trigger')
    await userEvent.click(selectTrigger)
    
    const option1 = screen.getByTestId('whatsapp-modal-phone-option-1')
    await userEvent.click(option1)
    
    const sendButton = screen.getByTestId('whatsapp-modal-send-button')
    await userEvent.click(sendButton)
    
    expect(onSend).toHaveBeenCalledWith(1) // Deuxième numéro sélectionné
  })

  it('should disable send button when isLoading', () => {
    render(<SendWhatsAppModalV2 {...defaultProps} isLoading={true} />)
    const sendButton = screen.getByTestId('whatsapp-modal-send-button')
    expect(sendButton).toBeDisabled()
  })

  it('should call onClose when cancel button is clicked', async () => {
    const onClose = vi.fn()
    render(<SendWhatsAppModalV2 {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByTestId('whatsapp-modal-cancel-button')
    await userEvent.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })
})
```

---

### 2.5 RenewSecurityCodeModalV2

**Fichier :** `src/domains/memberships/components/modals/RenewSecurityCodeModalV2.tsx`

**Tests :**
```typescript
describe('RenewSecurityCodeModalV2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onRenew: vi.fn(),
    currentCode: '123456',
    currentExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    memberName: 'Jean Dupont',
    isLoading: false,
  }

  it('should render modal when open', () => {
    render(<RenewSecurityCodeModalV2 {...defaultProps} />)
    expect(screen.getByTestId('renew-code-modal')).toBeInTheDocument()
  })

  it('should display warning message', () => {
    render(<RenewSecurityCodeModalV2 {...defaultProps} />)
    expect(screen.getByTestId('renew-code-modal-warning')).toBeInTheDocument()
  })

  it('should display current code', () => {
    render(<RenewSecurityCodeModalV2 {...defaultProps} />)
    const codeValue = screen.getByTestId('renew-code-modal-current-code-value')
    expect(codeValue).toHaveTextContent('123456')
  })

  it('should display current expiry', () => {
    render(<RenewSecurityCodeModalV2 {...defaultProps} />)
    const expiryValue = screen.getByTestId('renew-code-modal-current-expiry-value')
    expect(expiryValue).toBeInTheDocument()
  })

  it('should disable renew button when checkbox not checked', () => {
    render(<RenewSecurityCodeModalV2 {...defaultProps} />)
    const renewButton = screen.getByTestId('renew-code-modal-renew-button')
    expect(renewButton).toBeDisabled()
  })

  it('should enable renew button when checkbox is checked', async () => {
    render(<RenewSecurityCodeModalV2 {...defaultProps} />)
    const checkbox = screen.getByTestId('renew-code-modal-confirm-checkbox')
    await userEvent.click(checkbox)
    
    const renewButton = screen.getByTestId('renew-code-modal-renew-button')
    expect(renewButton).not.toBeDisabled()
  })

  it('should call onRenew when renew button is clicked', async () => {
    const onRenew = vi.fn()
    render(<RenewSecurityCodeModalV2 {...defaultProps} onRenew={onRenew} />)
    
    const checkbox = screen.getByTestId('renew-code-modal-confirm-checkbox')
    await userEvent.click(checkbox)
    
    const renewButton = screen.getByTestId('renew-code-modal-renew-button')
    await userEvent.click(renewButton)
    
    expect(onRenew).toHaveBeenCalled()
  })

  it('should show loading state when isLoading is true', () => {
    render(<RenewSecurityCodeModalV2 {...defaultProps} isLoading={true} />)
    const renewButton = screen.getByTestId('renew-code-modal-renew-button')
    expect(renewButton).toBeDisabled()
    expect(screen.getByText(/Régénération/)).toBeInTheDocument()
  })
})
```

---

### 2.6 Bloc "Corrections demandées" (dans MembershipRequestCard/Row)

**Fichier :** `src/domains/memberships/components/shared/CorrectionsBlockV2.tsx`

**Tests :**
```typescript
describe('CorrectionsBlockV2', () => {
  const defaultProps = {
    reviewNote: 'Photo floue\nAdresse incomplète\nSignature manquante',
    securityCode: '123456',
    securityCodeExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
    processedBy: 'admin-1',
    processedByName: 'Admin Test',
    processedByMatricule: 'MAT-001',
    onCopyLink: vi.fn(),
    onSendWhatsApp: vi.fn(),
    phoneNumbers: ['+24165671734'],
  }

  it('should render corrections block', () => {
    render(<CorrectionsBlockV2 {...defaultProps} />)
    expect(screen.getByTestId('corrections-block')).toBeInTheDocument()
  })

  it('should display max 3 corrections', () => {
    const reviewNote = 'Correction 1\nCorrection 2\nCorrection 3\nCorrection 4\nCorrection 5'
    render(<CorrectionsBlockV2 {...defaultProps} reviewNote={reviewNote} />)
    
    expect(screen.getByTestId('correction-item-0')).toHaveTextContent('Correction 1')
    expect(screen.getByTestId('correction-item-1')).toHaveTextContent('Correction 2')
    expect(screen.getByTestId('correction-item-2')).toHaveTextContent('Correction 3')
    
    // Vérifier "Voir plus"
    expect(screen.getByText(/Voir plus|... et/)).toBeInTheDocument()
    expect(screen.getByText(/2 autre\(s\)/)).toBeInTheDocument()
  })

  it('should format security code as AB12-CD34', () => {
    render(<CorrectionsBlockV2 {...defaultProps} />)
    const codeValue = screen.getByTestId('corrections-block-code-value')
    expect(codeValue).toHaveTextContent('12-34-56')
  })

  it('should display expiry date and remaining time', () => {
    render(<CorrectionsBlockV2 {...defaultProps} />)
    const expiryValue = screen.getByTestId('corrections-block-expiry-value')
    expect(expiryValue).toBeInTheDocument()
    
    const expiryRemaining = screen.getByTestId('corrections-block-expiry-remaining')
    expect(expiryRemaining).toHaveTextContent(/\(reste \d+j \d+h\)/)
  })

  it('should display processed by with name and matricule', () => {
    render(<CorrectionsBlockV2 {...defaultProps} />)
    const requestedByValue = screen.getByTestId('corrections-block-requested-by-value')
    expect(requestedByValue).toHaveTextContent('Admin Test')
    
    const requestedByMatricule = screen.getByTestId('corrections-block-requested-by-matricule')
    expect(requestedByMatricule).toHaveTextContent('(MAT-001)')
  })

  it('should call onCopyLink when copy button is clicked', async () => {
    const onCopyLink = vi.fn()
    render(<CorrectionsBlockV2 {...defaultProps} onCopyLink={onCopyLink} />)
    
    const copyButton = screen.getByTestId('corrections-block-copy-link-button')
    await userEvent.click(copyButton)
    
    expect(onCopyLink).toHaveBeenCalled()
  })

  it('should call onSendWhatsApp when WhatsApp button is clicked', async () => {
    const onSendWhatsApp = vi.fn()
    render(<CorrectionsBlockV2 {...defaultProps} onSendWhatsApp={onSendWhatsApp} />)
    
    const whatsappButton = screen.getByTestId('corrections-block-send-whatsapp-button')
    await userEvent.click(whatsappButton)
    
    expect(onSendWhatsApp).toHaveBeenCalled()
  })

  it('should not display WhatsApp button when no phone numbers', () => {
    render(<CorrectionsBlockV2 {...defaultProps} phoneNumbers={[]} />)
    expect(screen.queryByTestId('corrections-block-send-whatsapp-button')).not.toBeInTheDocument()
  })
})
```

---

## 🧪 3. Services

### 3.1 MembershipServiceV2.requestCorrections()

**Fichier :** `src/domains/memberships/services/MembershipServiceV2.ts`

**Tests :**
```typescript
describe('MembershipServiceV2.requestCorrections', () => {
  let service: MembershipServiceV2
  let mockRepository: jest.Mocked<MembershipRepositoryV2>
  let mockAdminRepository: jest.Mocked<AdminRepository>

  beforeEach(() => {
    mockRepository = {
      getById: vi.fn(),
      updateStatus: vi.fn(),
    } as any
    
    mockAdminRepository = {
      getAdminById: vi.fn(),
    } as any
    
    service = MembershipServiceV2.getInstance()
    // Inject mocks
  })

  it('should throw error if corrections array is empty', async () => {
    await expect(
      service.requestCorrections({
        requestId: 'test-id',
        adminId: 'admin-id',
        corrections: [],
        selectedPhoneIndex: 0,
      })
    ).rejects.toThrow('Au moins une correction requise')
  })

  it('should throw error if request not found', async () => {
    mockRepository.getById.mockResolvedValue(null)
    
    await expect(
      service.requestCorrections({
        requestId: 'non-existent',
        adminId: 'admin-id',
        corrections: ['Photo floue'],
        selectedPhoneIndex: 0,
      })
    ).rejects.toThrow('Demande introuvable')
  })

  it('should generate security code and expiry date', async () => {
    const mockRequest = { id: 'test-id', status: 'pending' } as MembershipRequest
    mockRepository.getById.mockResolvedValue(mockRequest)
    mockRepository.updateStatus.mockResolvedValue(true)
    mockAdminRepository.getAdminById.mockResolvedValue({
      id: 'admin-id',
      firstName: 'Admin',
      lastName: 'Test',
    } as Admin)
    
    const result = await service.requestCorrections({
      requestId: 'test-id',
      adminId: 'admin-id',
      corrections: ['Photo floue'],
      selectedPhoneIndex: 0,
    })
    
    expect(result.securityCode).toMatch(/^\d{6}$/)
    expect(result.securityCodeExpiry).toBeInstanceOf(Date)
    expect(result.securityCodeExpiry.getTime()).toBeGreaterThan(Date.now())
  })

  it('should update request status to under_review', async () => {
    const mockRequest = { id: 'test-id', status: 'pending' } as MembershipRequest
    mockRepository.getById.mockResolvedValue(mockRequest)
    mockRepository.updateStatus.mockResolvedValue(true)
    mockAdminRepository.getAdminById.mockResolvedValue({
      id: 'admin-id',
      firstName: 'Admin',
      lastName: 'Test',
    } as Admin)
    
    await service.requestCorrections({
      requestId: 'test-id',
      adminId: 'admin-id',
      corrections: ['Photo floue'],
      selectedPhoneIndex: 0,
    })
    
    expect(mockRepository.updateStatus).toHaveBeenCalledWith(
      'test-id',
      'under_review',
      expect.objectContaining({
        reviewNote: 'Photo floue',
        securityCodeUsed: false,
        processedBy: 'admin-id',
      })
    )
  })

  it('should generate WhatsApp URL if phone number available', async () => {
    const mockRequest = {
      id: 'test-id',
      status: 'pending',
      identity: {
        contacts: ['+24165671734'],
        firstName: 'Jean',
      },
    } as MembershipRequest
    
    mockRepository.getById.mockResolvedValue(mockRequest)
    mockRepository.updateStatus.mockResolvedValue(true)
    mockAdminRepository.getAdminById.mockResolvedValue({
      id: 'admin-id',
      firstName: 'Admin',
      lastName: 'Test',
    } as Admin)
    
    const result = await service.requestCorrections({
      requestId: 'test-id',
      adminId: 'admin-id',
      corrections: ['Photo floue'],
      selectedPhoneIndex: 0,
    })
    
    expect(result.whatsAppUrl).toBeDefined()
    expect(result.whatsAppUrl).toContain('wa.me')
    expect(result.whatsAppUrl).toContain('24165671734')
  })
})
```

---

### 3.2 MembershipServiceV2.renewSecurityCode()

**Fichier :** `src/domains/memberships/services/MembershipServiceV2.ts`

**Tests :**
```typescript
describe('MembershipServiceV2.renewSecurityCode', () => {
  let service: MembershipServiceV2
  let mockRepository: jest.Mocked<MembershipRepositoryV2>

  beforeEach(() => {
    mockRepository = {
      getById: vi.fn(),
      renewSecurityCode: vi.fn(),
    } as any
    
    service = MembershipServiceV2.getInstance()
  })

  it('should generate new code and update expiry', async () => {
    const mockRequest = {
      id: 'test-id',
      status: 'under_review',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    } as MembershipRequest
    
    mockRepository.getById.mockResolvedValue(mockRequest)
    mockRepository.renewSecurityCode.mockResolvedValue({
      success: true,
      newCode: '654321',
    })
    
    const result = await service.renewSecurityCode('test-id', 'admin-1')
    
    expect(result.success).toBe(true)
    expect(result.newCode).toBeDefined()
    expect(result.newCode).toMatch(/^\d{6}$/)
    expect(result.newCode).not.toBe('123456')
  })

  it('should throw error if request not found', async () => {
    mockRepository.getById.mockResolvedValue(null)
    
    await expect(
      service.renewSecurityCode('non-existent', 'admin-1')
    ).rejects.toThrow('Demande introuvable')
  })

  it('should throw error if request not in under_review status', async () => {
    const mockRequest = {
      id: 'test-id',
      status: 'pending',
    } as MembershipRequest
    
    mockRepository.getById.mockResolvedValue(mockRequest)
    
    await expect(
      service.renewSecurityCode('test-id', 'admin-1')
    ).rejects.toThrow('La demande doit être en correction')
  })
})
```

---

### 3.3 Utilitaires de formatage

**Fichier :** `src/utils/correctionUtils.ts`

**Tests :**
```typescript
describe('formatSecurityCode', () => {
  it('should format 6-digit code as AB12-CD34', () => {
    expect(formatSecurityCode('123456')).toBe('12-34-56')
  })

  it('should return code as is if not 6 digits', () => {
    expect(formatSecurityCode('12345')).toBe('12345')
    expect(formatSecurityCode('1234567')).toBe('1234567')
  })
})

describe('getTimeRemaining', () => {
  it('should calculate time remaining correctly', () => {
    const expiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000) // +2j 13h
    const remaining = getTimeRemaining(expiry)
    expect(remaining).toBe('2j 13h')
  })

  it('should handle expired date', () => {
    const expiry = new Date(Date.now() - 1000)
    const remaining = getTimeRemaining(expiry)
    expect(remaining).toBe('0j 0h')
  })
})

describe('generateCorrectionLink', () => {
  it('should generate link without code parameter', () => {
    const link = generateCorrectionLink('test-request-id')
    expect(link).toBe('/register?requestId=test-request-id')
    expect(link).not.toContain('code=')
  })
})
```

---

## ✅ Checklist

### Tests Utilitaires
- [x] SecurityCodeUtils (generateSecurityCode, calculateCodeExpiry, isSecurityCodeValid)
- [x] WhatsAppUrlUtils (normalizePhoneNumber, generateWhatsAppUrl)
- [x] Formatage (formatSecurityCode, getTimeRemaining, generateCorrectionLink)

### Tests Composants UI
- [x] CorrectionsModalV2 (modal simplifié, sans WhatsApp)
- [x] SecurityCodeFormV2 (6 inputs, auto-advance, validation)
- [x] CorrectionBannerV2 (affichage corrections)
- [x] SendWhatsAppModalV2 (sélection numéro, envoi)
- [x] RenewSecurityCodeModalV2 (confirmation, régénération)
- [x] CorrectionsBlockV2 (bloc "Corrections demandées" avec max 3)

### Tests Services
- [x] MembershipServiceV2.requestCorrections()
- [x] MembershipServiceV2.renewSecurityCode()

### Coverage
- [ ] **Objectif : 80% minimum**
- [ ] Utilitaires : 100% (tous les cas testés)
- [ ] Composants UI : 80%+ (tous les props et états)
- [ ] Services : 80%+ (happy path + erreurs)
- [ ] Repositories : 80%+ (CRUD operations)
