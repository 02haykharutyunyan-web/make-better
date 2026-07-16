import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260716000200_creator_application_lifecycle.sql', 'utf8');
const creatorsService = readFileSync('src/services/creators.ts', 'utf8');
const adminCreators = readFileSync('src/pages/admin/AdminCreators.tsx', 'utf8');
const dashboard = readFileSync('src/pages/creator/CreatorDashboard.tsx', 'utf8');
const signup = readFileSync('src/pages/CreatorSignupPage.tsx', 'utf8');

describe('creator application lifecycle', () => {
  it('defaults every new creator application to pending', () => {
    expect(migration).toMatch(/application_status public\.creator_status not null default 'pending'/);
    expect(migration).toMatch(/application_status, application_submitted_at\)/);
    expect(migration).toMatch(/'pending', now\(\)/);
    expect(creatorsService).toContain('application_status: "pending"');
  });

  it('prevents non-admin self approval and requires an admin rejection reason', () => {
    expect(migration).toMatch(/with check \(\(profile_id = auth\.uid\(\) and application_status = 'pending'\) or public\.is_admin\(\)\)/);
    expect(migration).toMatch(/application_status in \('pending', 'rejected'\)/);
    expect(migration).toMatch(/creators_rejection_reason_required/);
    expect(creatorsService).toContain('A rejection reason is required');
    expect(adminCreators).toContain('window.confirm');
  });

  it('allows only approved creators to submit assets or creator blogs', () => {
    expect(migration).toContain('public.is_approved_creator(creator_id)');
    expect(migration).toContain('approved creators can submit own assets');
    expect(migration).toContain('approved creators can submit own blog posts');
    expect(creatorsService).toContain('assertCreatorApproved(creator)');
  });

  it('surfaces pending and rejected states without unlocking paid-listing or submission access', () => {
    expect(dashboard).toContain('Application pending review');
    expect(dashboard).toContain('Your creator application was rejected.');
    expect(dashboard).toContain('paid-listing tools unlock only after admin approval');
    expect(signup).toContain('Application starts pending');
  });

  it('includes admin queue filtering and loading/empty/error/success states', () => {
    expect(adminCreators).toContain('const filters');
    expect(adminCreators).toContain('Loading creator applications');
    expect(adminCreators).toContain('No {filter === "all" ? "" : filter} creator applications found.');
    expect(adminCreators).toContain('setSuccess');
    expect(adminCreators).toContain('Required rejection reason');
  });
});
