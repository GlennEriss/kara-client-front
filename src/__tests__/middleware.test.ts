// @vitest-environment node

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { middleware } from '../middleware';

const fetchMock = vi.fn();
const fullAccess = { isSuperAdmin: true, isAgent: false, restrictedRole: null, permissions: [], permissionsDefined: true };
const limitedAccess = { ...fullAccess, isSuperAdmin: false, permissions: ['calendar.view'] };

function request(path: string, cookie = '__session=test-session') {
  return new NextRequest(`https://0.0.0.0:8080${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

describe('middleware — vérification de session sur App Hosting', () => {
  beforeEach(() => {
    vi.stubEnv('K_SERVICE', 'kara-admin');
    vi.stubEnv('PORT', '8080');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(Response.json({ authenticated: true, claims: { role: 'SuperAdmin' }, access: fullAccess }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('vérifie la session en HTTP local et laisse accéder au dashboard', async () => {
    const response = await middleware(request('/dashboard'));

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:8080/api/auth/session/verify'),
      expect.objectContaining({
        cache: 'no-store',
        headers: { cookie: '__session=test-session' },
      }),
    );
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirige un utilisateur connecté depuis l’accueil vers le dashboard', async () => {
    const response = await middleware(request('/'));
    expect(new URL(response.headers.get('location')!).pathname).toBe('/dashboard');
  });

  it('conserve la vérification sur l’origine de la requête hors Cloud Run', async () => {
    vi.stubEnv('K_SERVICE', '');
    await middleware(request('/dashboard'));
    expect(fetchMock.mock.calls[0][0].origin).toBe('https://0.0.0.0:8080');
  });

  it('refuse une session invalide', async () => {
    fetchMock.mockResolvedValue(Response.json({ authenticated: false }, { status: 401 }));
    const response = await middleware(request('/dashboard'));
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  it('refuse l’accès si la vérification échoue', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));
    const response = await middleware(request('/dashboard'));
    expect(response.status).toBe(503);
    expect(response.headers.has('location')).toBe(false);
  });

  it('redirige sans appel réseau en l’absence de cookie', async () => {
    const response = await middleware(request('/dashboard', ''));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  it('continue de refuser un rôle membre sur une route admin', async () => {
    fetchMock.mockResolvedValue(Response.json({ claims: { role: 'Member' } }));
    const response = await middleware(request('/dashboard'));
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  it('contrôle les permissions avant de servir une page et couvre les routes auparavant oubliées', async () => {
    fetchMock.mockImplementation(async () => Response.json({ authenticated: true, access: limitedAccess }));
    expect((await middleware(request('/calendrier'))).headers.get('x-middleware-next')).toBe('1');
    for (const path of ['/groups', '/events/nouveau', '/credit-fixe/contrats', '/credit-aide', '/parametres-messages', '/bilans-financiers']) {
      const response = await middleware(request(path));
      expect(new URL(response.headers.get('location')!).pathname, path).toBe('/dashboard');
    }
  });

  it('envoie directement un agent vers sa première section autorisée', async () => {
    fetchMock.mockImplementation(async () => Response.json({ authenticated: true, access: { ...limitedAccess, isAgent: true, restrictedRole: 'AgentRecouvrement' } }));
    for (const path of ['/', '/dashboard', '/groups']) {
      const response = await middleware(request(path));
      expect(new URL(response.headers.get('location')!).pathname).toBe('/calendrier');
    }
    expect((await middleware(request('/calendrier'))).headers.get('x-middleware-next')).toBe('1');
  });

  it('n’ouvre pas une URL de modification avec le seul droit de consultation', async () => {
    fetchMock.mockImplementation(async () => Response.json({ authenticated: true, access: { ...limitedAccess, permissions: ['events.view'] } }));
    expect((await middleware(request('/events'))).headers.get('x-middleware-next')).toBe('1');
    const response = await middleware(request('/events/e1/edit'));
    expect(new URL(response.headers.get('location')!).pathname).toBe('/dashboard');
  });

  it('ne crée pas de boucle pour un agent sans module et refuse proprement une panne des droits', async () => {
    fetchMock.mockImplementation(async () => Response.json({ authenticated: true, access: { ...limitedAccess, isAgent: true, permissions: [] } }));
    expect(new URL((await middleware(request('/dashboard'))).headers.get('location')!).pathname).toBe('/aide');
    expect((await middleware(request('/aide'))).headers.get('x-middleware-next')).toBe('1');
    fetchMock.mockImplementation(async () => Response.json({ error: 'ACCESS_UNAVAILABLE' }, { status: 503 }));
    expect((await middleware(request('/groups'))).status).toBe(503);
  });
});
