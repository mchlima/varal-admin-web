import type { components } from '../api/schema'

/** Atalhos para os schemas do OpenAPI usados nas telas (gerados, RN-01.11). */
type Schemas = components['schemas']

export type MetricsOverview = Schemas['MetricsOverview']
export type OrganizationUsage = Schemas['OrganizationUsage']
export type OrganizationUsageQuery = Schemas['OrganizationUsageQueryInput']
export type OrganizationSummary = Schemas['OrganizationSummary']
export type OrganizationDetail = Schemas['OrganizationDetail']
export type OrganizationListQuery = Schemas['OrganizationListQueryInput']
export type CreateOrganizationRequest = Schemas['CreateOrganizationRequestInput']
export type Announcement = Schemas['Announcement']
export type AnnouncementListQuery = Schemas['AnnouncementListQueryInput']
export type AuditLogEntry = Schemas['AuditLogEntry']
export type AuditLogListQuery = Schemas['AuditLogListQueryInput']
export type EmailLog = Schemas['EmailLog']
export type EmailLogListQuery = Schemas['EmailLogListQueryInput']
export type AdminUser = Schemas['AdminUser']
export type AdminUserListQuery = Schemas['AdminUserListQueryInput']
export type Role = Schemas['Role']
export type Impersonation = Schemas['Impersonation']
export type ImpersonationListQuery = Schemas['ImpersonationListQueryInput']
