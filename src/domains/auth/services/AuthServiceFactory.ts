import { UserRepository } from '../repositories/UserRepository'
import { LoginService } from './LoginService'
import { LogoutService } from './LogoutService'

/** L'authentification ne dépend pas des services de crédit, de caisse ou de placement. */
export class AuthServiceFactory {
  private static loginService: LoginService | undefined
  private static logoutService: LogoutService | undefined

  static getLoginService(): LoginService {
    return this.loginService ??= new LoginService(new UserRepository())
  }

  static getLogoutService(): LogoutService {
    return this.logoutService ??= new LogoutService()
  }

  static clearAllServices(): void {
    this.loginService = undefined
    this.logoutService = undefined
  }
}
