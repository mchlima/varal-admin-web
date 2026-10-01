import type { components, operations } from '../api/schema'

/** Atalhos para os schemas do OpenAPI usados nas telas (gerados, RN-01.11). */
type Schemas = components['schemas']

export type MetricsOverview = Schemas['MetricsOverview']
export type OrganizationUsage = Schemas['OrganizationUsage']
/** Período e ordenação de `GET /admin/metrics/organizations`, como a rota declara. */
export type OrganizationUsageQuery = NonNullable<
  operations['MetricsController_organizations']['parameters']['query']
>
export type OrganizationSummary = Schemas['OrganizationSummary']
export type OrganizationDetail = Schemas['OrganizationDetail']
export type CreateOrganizationRequest = Schemas['CreateOrganizationRequestInput']
export type Announcement = Schemas['Announcement']
export type AuditLogEntry = Schemas['AuditLogEntry']
export type EmailLog = Schemas['EmailLog']
export type AdminUser = Schemas['AdminUser']
export type Role = Schemas['Role']
export type Impersonation = Schemas['Impersonation']
