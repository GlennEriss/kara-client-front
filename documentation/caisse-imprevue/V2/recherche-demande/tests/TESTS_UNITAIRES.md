# Tests Unitaires - Recherche des Demandes (searchableText)

> Plan détaillé des tests unitaires pour la fonctionnalité de recherche avec `searchableText`.

## 📋 Vue d'ensemble

**Objectif** : Tester les unités isolées (utils, repository, composants purs)

**Framework** : Vitest  
**Structure** : `src/domains/financial/caisse-imprevue/__tests__/unit/` ou `src/utils/__tests__/`

**Référence** : [RECHERCHE_ANALYSE.md](../RECHERCHE_ANALYSE.md), [activite/RechercherDemandes.puml](../activite/RechercherDemandes.puml)

---

## 🧪 1. Utilitaires - generateDemandSearchableText

**Fichier à créer** : `src/utils/demandSearchableText.ts`  
**Tests** : `src/utils/__tests__/demandSearchableText.test.ts`

### 1.1 generateDemandSearchableText

```typescript
describe('generateDemandSearchableText', () => {
  it('devrait générer searchableText avec nom, prénom et matricule', () => {
    const result = generateDemandSearchableText('Dupont', 'Jean', '8438.MK.160126')
    expect(result).toBe('dupont jean 8438.mk.160126')
  })

  it('devrait normaliser en minuscules', () => {
    const result = generateDemandSearchableText('DUPONT', 'JEAN', '8438')
    expect(result).toBe('dupont jean 8438')
  })

  it('devrait supprimer les accents', () => {
    const result = generateDemandSearchableText('Dupont', 'José', '8438')
    expect(result).toBe('dupont jose 8438')
  })

  it('devrait filtrer les champs vides', () => {
    const result = generateDemandSearchableText('Dupont', '', '8438')
    expect(result).toBe('dupont 8438')
  })

  it('devrait trimmer les espaces', () => {
    const result = generateDemandSearchableText('  Dupont  ', '  Jean  ', '8438')
    expect(result).toBe('dupont jean 8438')
  })

  it('devrait gérer les champs undefined', () => {
    const result = generateDemandSearchableText('Dupont', undefined as any, '8438')
    expect(result).toContain('dupont')
    expect(result).toContain('8438')
  })

  it('devrait retourner une chaîne vide si tous les champs vides', () => {
    const result = generateDemandSearchableText('', '', '')
    expect(result).toBe('')
  })
})
```

### 1.2 normalizeSearchQuery (si exposée)

```typescript
describe('normalizeSearchQuery', () => {
  it('devrait normaliser la query utilisateur', () => {
    expect(normalizeSearchQuery('  DUPONT  ')).toBe('dupont')
    expect(normalizeSearchQuery('François')).toBe('francois')
  })
})
```

---

## 🧪 2. Repository - DemandCIRepository

**Fichier** : `src/domains/financial/caisse-imprevue/repositories/DemandCIRepository.ts`

### 2.1 create() - searchableText

```typescript
describe('DemandCIRepository.create - searchableText', () => {
  it('devrait ajouter searchableText lors de la création', async () => {
    const data = createDemandFixture({
      memberLastName: 'Dupont',
      memberFirstName: 'Jean',
      memberMatricule: '8438.MK.160126',
    })
    
    const result = await repository.create(data, '8438.MK.160126')
    
    const doc = await getDoc(doc(db, 'caisseImprevueDemands', result.id))
    expect(doc.data()?.searchableText).toBe('dupont jean 8438.mk.160126')
  })

  it('devrait générer searchableText avec accents normalisés', async () => {
    const data = createDemandFixture({
      memberLastName: 'François',
      memberFirstName: 'José',
      memberMatricule: '1234',
    })
    
    const result = await repository.create(data, '1234')
    
    const doc = await getDoc(doc(db, 'caisseImprevueDemands', result.id))
    expect(doc.data()?.searchableText).toContain('francois')
    expect(doc.data()?.searchableText).toContain('jose')
  })
})
```

### 2.2 getPaginated() - searchQuery

```typescript
describe('DemandCIRepository.getPaginated - searchQuery', () => {
  it('devrait filtrer par searchableText quand searchQuery >= 2 caractères', async () => {
    await createTestDemand({ searchableText: 'dupont jean 8438' })
    await createTestDemand({ searchableText: 'martin pierre 9999' })
    
    const result = await repository.getPaginated(
      { searchQuery: 'dupont' },
      { page: 1, limit: 10 },
      { sortBy: 'date', sortOrder: 'desc' }
    )
    
    expect(result.items).toHaveLength(1)
    expect(result.items[0].memberLastName).toBe('Dupont')
  })

  it('devrait ignorer searchQuery si < 2 caractères', async () => {
    const result = await repository.getPaginated(
      { searchQuery: 'd' },
      { page: 1, limit: 10 },
      { sortBy: 'date', sortOrder: 'desc' }
    )
    
    // Ne doit pas appliquer le filtre searchableText
    expect(result.items.length).toBeGreaterThanOrEqual(0)
  })

  it('devrait combiner searchQuery avec filtre statut', async () => {
    await createTestDemand({ searchableText: 'dupont jean 8438', status: 'PENDING' })
    await createTestDemand({ searchableText: 'dupont marie 9999', status: 'APPROVED' })
    
    const result = await repository.getPaginated(
      { searchQuery: 'dupont', status: 'PENDING' },
      { page: 1, limit: 10 },
      { sortBy: 'date', sortOrder: 'desc' }
    )
    
    expect(result.items).toHaveLength(1)
    expect(result.items[0].status).toBe('PENDING')
  })

  it('devrait combiner searchQuery avec filtre fréquence', async () => {
    await createTestDemand({ searchableText: 'dupont jean 8438', paymentFrequency: 'MONTHLY' })
    await createTestDemand({ searchableText: 'dupont marie 9999', paymentFrequency: 'DAILY' })
    
    const result = await repository.getPaginated(
      { searchQuery: 'dupont', paymentFrequency: 'MONTHLY' },
      { page: 1, limit: 10 },
      { sortBy: 'date', sortOrder: 'desc' }
    )
    
    expect(result.items).toHaveLength(1)
    expect(result.items[0].paymentFrequency).toBe('MONTHLY')
  })

  it('devrait retourner pagination correcte avec searchQuery', async () => {
    await createMultipleTestDemandsWithSearchableText('dupont', 15)
    
    const result = await repository.getPaginated(
      { searchQuery: 'dupont' },
      { page: 1, limit: 10 },
      { sortBy: 'date', sortOrder: 'desc' }
    )
    
    expect(result.items).toHaveLength(10)
    expect(result.pagination.total).toBe(15)
    expect(result.pagination.hasNextPage).toBe(true)
    expect(result.pagination.nextCursor).toBeDefined()
  })

  it('devrait normaliser searchQuery (lowercase, trim, accents)', async () => {
    await createTestDemand({ searchableText: 'dupont jean 8438' })
    
    const result = await repository.getPaginated(
      { searchQuery: '  DUPONT  ' },
      { page: 1, limit: 10 },
      { sortBy: 'date', sortOrder: 'desc' }
    )
    
    expect(result.items).toHaveLength(1)
  })
})
```

### 2.3 update() - searchableText (si membre modifiable)

```typescript
describe('DemandCIRepository.update - searchableText', () => {
  it('devrait recalculer searchableText si memberLastName modifié', async () => {
    const demand = await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Jean' })
    
    await repository.update(demand.id, { memberLastName: 'Martin' } as any, 'admin-1')
    
    const doc = await getDoc(doc(db, 'caisseImprevueDemands', demand.id))
    expect(doc.data()?.searchableText).toContain('martin')
  })
})
```

---

## 🧪 3. Hook - useDebounce

**Fichier** : `src/hooks/shared/useDebounce.ts`  
**Usage** : DemandSearchV2 utilise useDebounce(query, 300)

```typescript
describe('useDebounce - recherche', () => {
  it('devrait retarder la valeur de 300ms', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: '' } }
    )
    
    expect(result.current).toBe('')
    
    rerender({ value: 'Dupont' })
    expect(result.current).toBe('') // Pas encore mis à jour
    
    await act(async () => {
      await new Promise(r => setTimeout(r, 350))
    })
    
    expect(result.current).toBe('Dupont')
  })

  it('devrait annuler la mise à jour si valeur change avant le délai', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'D' } }
    )
    
    rerender({ value: 'Du' })
    await act(async () => { await new Promise(r => setTimeout(r, 100)) })
    rerender({ value: 'Dup' })
    await act(async () => { await new Promise(r => setTimeout(r, 100)) })
    rerender({ value: 'Dupont' })
    await act(async () => { await new Promise(r => setTimeout(r, 350)) })
    
    expect(result.current).toBe('Dupont')
  })
})
```

---

## 🧪 4. Composant - DemandSearchV2 (unitaire avec mocks)

**Fichier** : `src/domains/financial/caisse-imprevue/components/demandes/filters/DemandSearchV2.tsx`

```typescript
describe('DemandSearchV2', () => {
  it('devrait afficher l\'input de recherche', () => {
    render(<DemandSearchV2 value="" onChange={vi.fn()} />)
    expect(screen.getByTestId('demand-search-input')).toBeInTheDocument()
  })

  it('devrait afficher le placeholder', () => {
    render(<DemandSearchV2 value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Rechercher par nom, prénom ou matricule/)).toBeInTheDocument()
  })

  it('devrait appeler onChange quand l\'utilisateur tape', async () => {
    const onChange = vi.fn()
    render(<DemandSearchV2 value="" onChange={onChange} />)
    
    await userEvent.type(screen.getByTestId('demand-search-input'), 'Dupont')
    
    expect(onChange).toHaveBeenCalled()
  })

  it('devrait afficher le bouton clear quand value non vide', () => {
    render(<DemandSearchV2 value="Dupont" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /clear|effacer/i })).toBeInTheDocument()
  })

  it('devrait appeler onChange("") quand on clique sur clear', async () => {
    const onChange = vi.fn()
    render(<DemandSearchV2 value="Dupont" onChange={onChange} />)
    
    await userEvent.click(screen.getByRole('button', { name: /clear|effacer/i }))
    
    expect(onChange).toHaveBeenCalledWith('')
  })
})
```

---

## 📊 Résumé

| Catégorie | Fichier | Nombre de tests | Priorité |
|-----------|---------|-----------------|----------|
| **Utils** | `demandSearchableText.test.ts` | ~10 | P0 |
| **Repository** | `DemandCIRepository.test.ts` (searchableText) | ~12 | P0 |
| **Hook** | `useDebounce.test.ts` | ~3 | P1 |
| **Composant** | `DemandSearchV2.test.tsx` | ~6 | P0 |
| **TOTAL** | | **~31 tests** | |

---

## ✅ Checklist

- [ ] Créer `src/utils/demandSearchableText.ts`
- [ ] Créer `src/utils/__tests__/demandSearchableText.test.ts`
- [ ] Ajouter tests searchableText dans `DemandCIRepository.test.ts`
- [ ] Ajouter tests searchQuery dans `DemandCIRepository.test.ts`
- [ ] Adapter DemandSearchV2 en composant contrôlé (value/onChange)
- [ ] Créer `DemandSearchV2.test.tsx`
- [ ] Exécuter `pnpm test` et vérifier couverture
