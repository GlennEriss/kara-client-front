import { defaultTemplateBody } from '../constants/message-templates'
import { renderTemplate, type TemplateVariables } from './renderTemplate'

export type MessageRenderer = (key: string, variables?: TemplateVariables) => string
export const renderDefaultMessage: MessageRenderer = (key, variables = {}) =>
  renderTemplate(defaultTemplateBody(key), variables)
